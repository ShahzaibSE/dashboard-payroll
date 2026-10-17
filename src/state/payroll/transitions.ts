import type { ActivityEvent, AuditKind, PayrollException, PayrollRun } from '@/fixtures'
import { REFERENCE_DATE } from '@/fixtures/reference'
import { SIMULATED_ACTOR } from '@/state/payroll/actor'
import { parseRejectReason } from '@/state/payroll/rejectReason'
import type { PayrollAction, PayrollState } from '@/state/payroll/types'

/**
 * Pure business rules for the simulated workflow. Nothing here reads the clock, generates random values, or touches React.
 *
 * Transition table (every other combination is invalid):
 *   run in_review         --submit--> pending_approval
 *   run pending_approval  --approve-> approved          (blocked while the run has an unresolved critical exception)
 *   run pending_approval  --reject--> in_review         (needs a reason)
 *   exception open        --take----> in_progress       (assignee = the simulated actor)
 *   exception open|in_progress --resolve--> resolved    (assignee cleared)
 * Exception actions are refused on paid runs.
 */

export type FailureCode =
  | 'unknown_run'
  | 'unknown_exception'
  | 'invalid_status'
  | 'unresolved_critical'
  | 'invalid_reason'
  | 'run_paid'
  | 'unknown_action'

type Refusal = { allowed: false; code: FailureCode; message: string }
export type Eligibility = { allowed: true } | Refusal
export type TransitionResult = { ok: true; state: PayrollState } | { ok: false; code: FailureCode; message: string }

const allowed: Eligibility = { allowed: true }
const refuse = (code: FailureCode, message: string): Refusal => ({ allowed: false, code, message })

const findRun = (state: PayrollState, runId: string) => state.runs.find((run) => run.id === runId)
const findException = (state: PayrollState, exceptionId: string) => state.exceptions.find((e) => e.id === exceptionId)

/** Unresolved critical exceptions that block approving a run. */
export const unresolvedCriticalCount = (state: PayrollState, runId: string) =>
  state.exceptions.filter((e) => e.runId === runId && e.severity === 'critical' && e.status !== 'resolved').length

export function canSubmit(state: PayrollState, runId: string): Eligibility {
  const run = findRun(state, runId)
  if (!run) return refuse('unknown_run', 'That run does not exist.')
  if (run.status !== 'in_review') return refuse('invalid_status', 'Only runs in review can be submitted for approval.')
  return allowed
}

export function canApprove(state: PayrollState, runId: string): Eligibility {
  const run = findRun(state, runId)
  if (!run) return refuse('unknown_run', 'That run does not exist.')
  if (run.status !== 'pending_approval') return refuse('invalid_status', 'Only runs awaiting approval can be approved.')
  const blockers = unresolvedCriticalCount(state, runId)
  if (blockers > 0) return refuse('unresolved_critical', `Resolve ${blockers} critical exception${blockers === 1 ? '' : 's'} first.`)
  return allowed
}

export function canReject(state: PayrollState, runId: string): Eligibility {
  const run = findRun(state, runId)
  if (!run) return refuse('unknown_run', 'That run does not exist.')
  if (run.status !== 'pending_approval') return refuse('invalid_status', 'Only runs awaiting approval can be rejected.')
  return allowed
}

/** Checks an exception action once and hands back the exception it found, so callers never look it up again. */
function checkException(
  state: PayrollState,
  exceptionId: string,
  openStatuses: PayrollException['status'][],
): Refusal | { allowed: true; exception: PayrollException } {
  const exception = findException(state, exceptionId)
  if (!exception) return refuse('unknown_exception', 'That exception does not exist.')
  const run = findRun(state, exception.runId)
  if (!run) return refuse('unknown_run', 'That exception points at a run that does not exist.')
  if (run.status === 'paid') return refuse('run_paid', 'This run is already paid, so its exceptions are closed.')
  if (!openStatuses.includes(exception.status)) {
    return refuse('invalid_status', exception.status === 'resolved' ? 'This exception is already resolved.' : 'Someone already owns this exception.')
  }
  return { allowed: true, exception }
}

const toEligibility = (check: Refusal | { allowed: true }): Eligibility => (check.allowed ? allowed : check)

export const canTake = (state: PayrollState, exceptionId: string) => toEligibility(checkException(state, exceptionId, ['open']))
export const canResolve = (state: PayrollState, exceptionId: string) => toEligibility(checkException(state, exceptionId, ['open', 'in_progress']))

const EVENT_ID = /^evt-(\d+)$/

/**
 * Next audit event id: one more than the highest existing number. Events are append-only and never removed or renumbered,
 * so the highest number only grows and an id can never be issued twice. (`events.length + 1` would collide if that ever changed.)
 */
export function nextEventId(events: ActivityEvent[]): string {
  const highest = events.reduce((max, event) => Math.max(max, Number(EVENT_ID.exec(event.id)?.[1] ?? 0)), 0)
  return `evt-${String(highest + 1).padStart(3, '0')}`
}

const MINUTE_MS = 60_000

/**
 * Next audit timestamp: one minute after the newest event (UTC, minute precision), so time only moves forward.
 * The 09:00 floor on the reference date only applies when there are no events newer than that.
 */
export function nextTimestamp(events: ActivityEvent[]): string {
  const newest = events.reduce((latest, event) => (event.occurredAt > latest ? event.occurredAt : latest), `${REFERENCE_DATE}T09:00`)
  return new Date(Date.parse(`${newest}:00Z`) + MINUTE_MS).toISOString().slice(0, 16)
}

type EventDraft = { runId: string; kind: AuditKind; action: string; reason?: string }

/** New events go first because the list is newest first. */
function withEvent(events: ActivityEvent[], draft: EventDraft): ActivityEvent[] {
  const event: ActivityEvent = {
    id: nextEventId(events),
    occurredAt: nextTimestamp(events),
    actor: SIMULATED_ACTOR.name,
    action: draft.action,
    runId: draft.runId,
    kind: draft.kind,
    ...(draft.reason === undefined ? {} : { reason: draft.reason }),
  }
  return [event, ...events]
}

function withRunStatus(state: PayrollState, runId: string, status: PayrollRun['status'], draft: Omit<EventDraft, 'runId'>): PayrollState {
  return {
    ...state,
    runs: state.runs.map((run) => (run.id === runId ? { ...run, status, updatedOn: REFERENCE_DATE } : run)),
    events: withEvent(state.events, { runId, ...draft }),
  }
}

const fail = ({ code, message }: Refusal): TransitionResult => ({ ok: false, code, message })

/**
 * Pure: applies one workflow action. A refused action returns `{ ok: false }` and never builds a new state,
 * so callers can keep the old state reference. `demo/reset` is handled by the reducer, which owns the initial data.
 */
export function applyAction(state: PayrollState, action: PayrollAction): TransitionResult {
  switch (action.type) {
    case 'run/submit': {
      const check = canSubmit(state, action.runId)
      if (!check.allowed) return fail(check)
      return { ok: true, state: withRunStatus(state, action.runId, 'pending_approval', { kind: 'run.submitted', action: 'submitted the run for approval' }) }
    }
    case 'run/approve': {
      const check = canApprove(state, action.runId)
      if (!check.allowed) return fail(check)
      return { ok: true, state: withRunStatus(state, action.runId, 'approved', { kind: 'run.approved', action: 'approved the run' }) }
    }
    case 'run/reject': {
      const check = canReject(state, action.runId)
      if (!check.allowed) return fail(check)
      const reason = parseRejectReason(action.reason)
      if (!reason.ok) return { ok: false, code: 'invalid_reason', message: reason.message }
      return {
        ok: true,
        state: withRunStatus(state, action.runId, 'in_review', { kind: 'run.rejected', action: 'rejected the run and returned it to review:', reason: reason.value }),
      }
    }
    case 'exception/take': {
      const check = checkException(state, action.exceptionId, ['open'])
      if (!check.allowed) return fail(check)
      const { runId } = check.exception
      return {
        ok: true,
        state: {
          ...state,
          exceptions: state.exceptions.map((e) => (e.id === action.exceptionId ? { ...e, status: 'in_progress', assignee: SIMULATED_ACTOR.name } : e)),
          events: withEvent(state.events, { runId, kind: 'exception.taken', action: 'took ownership of an exception on' }),
        },
      }
    }
    case 'exception/resolve': {
      const check = checkException(state, action.exceptionId, ['open', 'in_progress'])
      if (!check.allowed) return fail(check)
      const { runId } = check.exception
      return {
        ok: true,
        state: {
          ...state,
          exceptions: state.exceptions.map((e) => {
            if (e.id !== action.exceptionId) return e
            const resolved: PayrollException = { ...e, status: 'resolved' }
            delete resolved.assignee
            return resolved
          }),
          events: withEvent(state.events, { runId, kind: 'exception.resolved', action: 'resolved an exception on' }),
        },
      }
    }
    default:
      // Includes `demo/reset`, which the reducer handles because it owns the initial data.
      return { ok: false, code: 'unknown_action', message: 'That action is not a workflow transition.' }
  }
}
