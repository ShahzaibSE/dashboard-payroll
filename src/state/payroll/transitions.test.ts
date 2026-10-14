import { describe, expect, it } from 'vitest'
import { activityEvents, exceptions, payrollRuns } from '@/fixtures'
import { SIMULATED_ACTOR } from '@/state/payroll/actor'
import { createInitialState, payrollReducer } from '@/state/payroll/reducer'
import {
  applyAction,
  canApprove,
  canReject,
  canResolve,
  canSubmit,
  canTake,
  nextEventId,
  nextTimestamp,
  unresolvedCriticalCount,
} from '@/state/payroll/transitions'
import type { PayrollAction, PayrollState } from '@/state/payroll/types'

const run = (n: number) => `run-2026-10-${String(n).padStart(3, '0')}`
const exc = (n: number) => `exc-${String(n).padStart(3, '0')}`
const GOOD_REASON = 'Net pay variance is not explained.'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

/** A fresh, deeply frozen copy, so any in-place mutation by the code under test throws. */
const frozenState = (): PayrollState => deepFreeze(structuredClone(createInitialState()))

const statusOf = (state: PayrollState, id: string) => state.runs.find((r) => r.id === id)?.status
const exceptionOf = (state: PayrollState, id: string) => state.exceptions.find((e) => e.id === id)

describe('run guards across every fixture run', () => {
  const state = createInitialState()

  it.each(payrollRuns.map((r) => [r.id, r.status] as const))('%s (%s) allows exactly the approved actions', (id, status) => {
    const blocked = unresolvedCriticalCount(state, id) > 0

    expect(canSubmit(state, id).allowed).toBe(status === 'in_review')
    expect(canReject(state, id).allowed).toBe(status === 'pending_approval')
    expect(canApprove(state, id).allowed).toBe(status === 'pending_approval' && !blocked)
    expect(applyAction(state, { type: 'run/submit', runId: id }).ok).toBe(status === 'in_review')
    expect(applyAction(state, { type: 'run/approve', runId: id }).ok).toBe(status === 'pending_approval' && !blocked)
    expect(applyAction(state, { type: 'run/reject', runId: id, reason: GOOD_REASON }).ok).toBe(status === 'pending_approval')
  })

  it('has both a blocked and an approvable pending run in the fixtures', () => {
    expect(canApprove(state, run(14)).allowed).toBe(true)
    expect(canApprove(state, run(10))).toEqual({ allowed: false, code: 'unresolved_critical', message: 'Resolve 1 critical exception first.' })
    expect(canApprove(state, run(13))).toMatchObject({ allowed: false, code: 'unresolved_critical' })
  })

  it('keeps blocking approval while the critical exception is only in progress', () => {
    const owned = payrollReducer(createInitialState(), { type: 'exception/take', exceptionId: exc(1) })

    expect(exceptionOf(owned, exc(1))?.status).toBe('in_progress')
    expect(canApprove(owned, run(10))).toEqual({ allowed: false, code: 'unresolved_critical', message: 'Resolve 1 critical exception first.' })
    expect(payrollReducer(owned, { type: 'run/approve', runId: run(10) })).toBe(owned)
  })

  it('refuses unknown runs and exceptions', () => {
    expect(canSubmit(state, 'nope')).toMatchObject({ allowed: false, code: 'unknown_run' })
    expect(canApprove(state, 'nope')).toMatchObject({ allowed: false, code: 'unknown_run' })
    expect(canReject(state, 'nope')).toMatchObject({ allowed: false, code: 'unknown_run' })
    expect(canTake(state, 'nope')).toMatchObject({ allowed: false, code: 'unknown_exception' })
    expect(canResolve(state, 'nope')).toMatchObject({ allowed: false, code: 'unknown_exception' })
  })

  it('pluralises the blocker message', () => {
    const two: PayrollState = {
      ...state,
      exceptions: [...state.exceptions, { id: 'exc-900', runId: run(10), severity: 'critical', status: 'open', title: 'Another', raisedOn: '2026-10-12' }],
    }

    expect(canApprove(two, run(10))).toMatchObject({ message: 'Resolve 2 critical exceptions first.' })
  })
})

describe('approve', () => {
  it('moves the run, stamps it, and appends exactly one audit event, changing nothing else', () => {
    const before = frozenState()
    const result = applyAction(before, { type: 'run/approve', runId: run(14) })

    if (!result.ok) throw new Error('expected success')
    const after = result.state
    expect(statusOf(after, run(14))).toBe('approved')
    expect(after.runs.find((r) => r.id === run(14))).toMatchObject({ updatedOn: '2026-10-12', employeeCount: 52, grossUsd: 328_848 })
    expect(after.events).toHaveLength(before.events.length + 1)
    expect(after.events[0]).toEqual({
      id: 'evt-009',
      occurredAt: '2026-10-12T09:42',
      actor: SIMULATED_ACTOR.name,
      action: 'approved the run',
      runId: run(14),
      kind: 'run.approved',
    })
    expect(after.events.slice(1)).toEqual(before.events)
    // Structural sharing: every other record keeps its identity.
    expect(after.exceptions).toBe(before.exceptions)
    after.runs.forEach((r, i) => {
      if (r.id !== run(14)) expect(r).toBe(before.runs[i])
    })
  })

  it('keeps the other runs and exceptions by reference for every run action', () => {
    const before = frozenState()
    const actions: PayrollAction[] = [
      { type: 'run/submit', runId: run(16) },
      { type: 'run/reject', runId: run(11), reason: GOOD_REASON },
    ]

    for (const action of actions) {
      const result = applyAction(before, action)
      if (!result.ok || !('runId' in action)) throw new Error('expected success')
      expect(result.state.exceptions).toBe(before.exceptions)
      result.state.runs.forEach((r, i) => {
        if (r.id !== action.runId) expect(r).toBe(before.runs[i])
      })
    }
  })

  it('is refused while a critical exception is open, and then allowed once it is resolved', () => {
    const state = createInitialState()
    const refused = applyAction(state, { type: 'run/approve', runId: run(10) })

    expect(refused).toEqual({ ok: false, code: 'unresolved_critical', message: 'Resolve 1 critical exception first.' })
    expect(payrollReducer(state, { type: 'run/approve', runId: run(10) })).toBe(state)

    const resolved = payrollReducer(state, { type: 'exception/resolve', exceptionId: exc(1) })
    const approved = payrollReducer(resolved, { type: 'run/approve', runId: run(10) })
    expect(statusOf(approved, run(10))).toBe('approved')
    // The high-severity exception that is still in progress does not block approval.
    expect(exceptionOf(approved, exc(3))?.status).toBe('in_progress')
  })

  it('cannot be repeated', () => {
    const once = payrollReducer(createInitialState(), { type: 'run/approve', runId: run(14) })

    expect(applyAction(once, { type: 'run/approve', runId: run(14) })).toMatchObject({ ok: false, code: 'invalid_status' })
    expect(payrollReducer(once, { type: 'run/approve', runId: run(14) })).toBe(once)
  })
})

describe('reject', () => {
  it('returns the run to review and records the trimmed reason', () => {
    const result = applyAction(frozenState(), { type: 'run/reject', runId: run(11), reason: `   ${GOOD_REASON}   ` })

    if (!result.ok) throw new Error('expected success')
    expect(statusOf(result.state, run(11))).toBe('in_review')
    expect(result.state.events[0]).toMatchObject({ kind: 'run.rejected', runId: run(11), reason: GOOD_REASON, actor: SIMULATED_ACTOR.name })
    expect(result.state.events).toHaveLength(9)
  })

  it.each([
    ['empty', ''],
    ['only spaces', '          '],
    ['nine characters', '123456789'],
    ['nine characters plus padding', '   123456789   '],
    ['301 characters', 'x'.repeat(301)],
  ])('refuses a reason that is %s without changing state', (_label, reason) => {
    const state = createInitialState()
    const action: PayrollAction = { type: 'run/reject', runId: run(11), reason }

    expect(applyAction(state, action)).toMatchObject({ ok: false, code: 'invalid_reason' })
    expect(payrollReducer(state, action)).toBe(state)
  })

  it('accepts the boundary lengths of 10 and 300 characters', () => {
    const state = createInitialState()

    expect(applyAction(state, { type: 'run/reject', runId: run(11), reason: '1234567890' }).ok).toBe(true)
    expect(applyAction(state, { type: 'run/reject', runId: run(11), reason: 'x'.repeat(300) }).ok).toBe(true)
  })

  it('treats HTML in the reason as plain text', () => {
    const reason = '<img src=x onerror=alert(1)> please fix'
    const result = applyAction(createInitialState(), { type: 'run/reject', runId: run(11), reason })

    if (!result.ok) throw new Error('expected success')
    expect(result.state.events[0].reason).toBe(reason)
  })

  it('checks the status before the reason', () => {
    expect(applyAction(createInitialState(), { type: 'run/reject', runId: run(16), reason: '' })).toMatchObject({ code: 'invalid_status' })
  })
})

describe('submit', () => {
  it('sends a run in review to approval', () => {
    const result = applyAction(frozenState(), { type: 'run/submit', runId: run(16) })

    if (!result.ok) throw new Error('expected success')
    expect(statusOf(result.state, run(16))).toBe('pending_approval')
    expect(result.state.events[0]).toMatchObject({ kind: 'run.submitted', action: 'submitted the run for approval', runId: run(16) })
  })

  it('makes a rejected run submittable again', () => {
    const rejected = payrollReducer(createInitialState(), { type: 'run/reject', runId: run(11), reason: GOOD_REASON })
    const resubmitted = payrollReducer(rejected, { type: 'run/submit', runId: run(11) })

    expect(statusOf(resubmitted, run(11))).toBe('pending_approval')
    expect(resubmitted.events.slice(0, 2).map((e) => e.kind)).toEqual(['run.submitted', 'run.rejected'])
  })
})

describe('exceptions', () => {
  it('take: an open exception becomes in progress and is assigned to the simulated actor', () => {
    const before = frozenState()
    const result = applyAction(before, { type: 'exception/take', exceptionId: exc(4) })

    if (!result.ok) throw new Error('expected success')
    expect(exceptionOf(result.state, exc(4))).toMatchObject({ status: 'in_progress', assignee: SIMULATED_ACTOR.name })
    expect(result.state.events[0]).toMatchObject({ kind: 'exception.taken', runId: run(11) })
    expect(result.state.runs).toBe(before.runs)
    result.state.exceptions.forEach((e, i) => {
      if (e.id !== exc(4)) expect(e).toBe(before.exceptions[i])
    })
  })

  it('take: refuses exceptions that are already owned or resolved', () => {
    const state = createInitialState()

    expect(canTake(state, exc(3))).toMatchObject({ allowed: false, code: 'invalid_status' })
    expect(canTake(state, exc(13))).toMatchObject({ allowed: false, code: 'invalid_status' })
  })

  it('resolve: works from open and from in progress, and clears the assignee', () => {
    const state = frozenState()
    const fromOpen = applyAction(state, { type: 'exception/resolve', exceptionId: exc(2) })
    const fromProgress = applyAction(state, { type: 'exception/resolve', exceptionId: exc(3) })

    if (!fromOpen.ok || !fromProgress.ok) throw new Error('expected success')
    expect(exceptionOf(fromOpen.state, exc(2))?.status).toBe('resolved')
    expect(exceptionOf(fromProgress.state, exc(3))?.status).toBe('resolved')
    expect('assignee' in (exceptionOf(fromProgress.state, exc(3)) ?? {})).toBe(false)
    expect(fromProgress.state.events[0]).toMatchObject({ kind: 'exception.resolved', runId: run(10) })
    expect(fromProgress.state.runs).toBe(state.runs)
    fromProgress.state.exceptions.forEach((e, i) => {
      if (e.id !== exc(3)) expect(e).toBe(state.exceptions[i])
    })
  })

  it('resolve: a resolved exception never reopens and cannot be resolved twice', () => {
    const state = createInitialState()

    expect(canResolve(state, exc(13))).toMatchObject({ allowed: false, code: 'invalid_status' })
    expect(canTake(state, exc(13)).allowed).toBe(false)
  })

  it('refuses exception actions on a paid run', () => {
    const state: PayrollState = {
      ...createInitialState(),
      exceptions: [...exceptions, { id: 'exc-901', runId: run(1), severity: 'low', status: 'open', title: 'Late note', raisedOn: '2026-10-12' }],
    }

    expect(canTake(state, 'exc-901')).toMatchObject({ allowed: false, code: 'run_paid' })
    expect(canResolve(state, 'exc-901')).toMatchObject({ allowed: false, code: 'run_paid' })
    expect(payrollReducer(state, { type: 'exception/resolve', exceptionId: 'exc-901' })).toBe(state)
  })

  it('reports a paid run before the exception status, so a resolved exception on a paid run says why it is closed', () => {
    const state: PayrollState = {
      ...createInitialState(),
      exceptions: [{ id: 'exc-903', runId: run(1), severity: 'low', status: 'resolved', title: 'Old note', raisedOn: '2026-10-08' }],
    }

    expect(canResolve(state, 'exc-903')).toMatchObject({ allowed: false, code: 'run_paid' })
  })

  it('refuses an exception whose run is missing', () => {
    const state: PayrollState = {
      ...createInitialState(),
      exceptions: [{ id: 'exc-902', runId: 'run-missing', severity: 'low', status: 'open', title: 'Orphan', raisedOn: '2026-10-12' }],
    }

    expect(canResolve(state, 'exc-902')).toMatchObject({ allowed: false, code: 'unknown_run' })
  })
})

describe('invalid actions never change anything', () => {
  const state = createInitialState()
  const refused: PayrollAction[] = [
    { type: 'run/submit', runId: run(14) },
    { type: 'run/submit', runId: 'nope' },
    { type: 'run/approve', runId: run(10) },
    { type: 'run/approve', runId: run(16) },
    { type: 'run/approve', runId: run(1) },
    { type: 'run/reject', runId: run(16), reason: GOOD_REASON },
    { type: 'run/reject', runId: run(14), reason: 'no' },
    { type: 'exception/take', exceptionId: exc(3) },
    { type: 'exception/resolve', exceptionId: exc(13) },
    { type: 'exception/resolve', exceptionId: 'nope' },
    { type: 'unknown' } as never,
  ]

  it.each(refused.map((a) => [JSON.stringify(a), a] as const))('%s returns the same state reference and no new event', (_label, action) => {
    const next = payrollReducer(state, action)

    expect(next).toBe(state)
    expect(next.events).toHaveLength(activityEvents.length)
  })
})

describe('audit identifiers and timestamps', () => {
  const event = (id: string, occurredAt: string) => ({ id, occurredAt, actor: 'x', action: 'y', runId: run(1), kind: 'run.paid' as const })

  it('derives the next id from the highest number, not from the count', () => {
    expect(nextEventId([])).toBe('evt-001')
    expect(nextEventId([event('evt-003', 'a'), event('evt-010', 'b')])).toBe('evt-011')
    expect(nextEventId([event('evt-010', 'a'), event('evt-002', 'b')])).toBe('evt-011')
    expect(nextEventId([event('legacy-7', 'a')])).toBe('evt-001')
    expect(nextEventId([event('evt-999', 'a')])).toBe('evt-1000')
  })

  it('moves time forward by one minute from the newest event, in any list order', () => {
    expect(nextTimestamp([])).toBe('2026-10-12T09:01')
    expect(nextTimestamp(activityEvents)).toBe('2026-10-12T09:42')
    expect(nextTimestamp([event('e1', '2026-10-12T08:00'), event('e2', '2026-10-12T10:30'), event('e3', '2026-10-12T09:00')])).toBe('2026-10-12T10:31')
  })

  it('floors at 09:00 on the reference date when no event is newer than that', () => {
    expect(nextTimestamp([event('e1', '2026-10-11T17:00')])).toBe('2026-10-12T09:01')
  })

  it('rolls over hours and days', () => {
    expect(nextTimestamp([event('e1', '2026-10-12T09:59')])).toBe('2026-10-12T10:00')
    expect(nextTimestamp([event('e1', '2026-10-12T23:59')])).toBe('2026-10-13T00:00')
  })

  it('stays unique and strictly increasing across a sequence of actions', () => {
    const steps: PayrollAction[] = [
      { type: 'run/submit', runId: run(16) },
      { type: 'run/approve', runId: run(14) },
      { type: 'exception/take', exceptionId: exc(4) },
      { type: 'exception/resolve', exceptionId: exc(4) },
      { type: 'run/reject', runId: run(11), reason: GOOD_REASON },
      { type: 'run/approve', runId: run(10) }, // refused: critical open, so no event
      { type: 'exception/resolve', exceptionId: exc(1) },
      { type: 'run/approve', runId: run(10) },
    ]
    const final = steps.reduce(payrollReducer, frozenState())

    // 8 steps, one refused: seven new events on top of the eight seeds.
    expect(final.events).toHaveLength(8 + 7)
    const ids = final.events.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.slice(0, 7)).toEqual(['evt-015', 'evt-014', 'evt-013', 'evt-012', 'evt-011', 'evt-010', 'evt-009'])
    const times = final.events.map((e) => e.occurredAt)
    expect(times).toEqual([...times].sort().reverse())
    expect(new Set(times).size).toBe(times.length)
    // Seven new events after the seed's newest (09:41), one minute apart, newest first.
    expect(final.events.slice(0, 7).map((e) => e.occurredAt)).toEqual([
      '2026-10-12T09:48',
      '2026-10-12T09:47',
      '2026-10-12T09:46',
      '2026-10-12T09:45',
      '2026-10-12T09:44',
      '2026-10-12T09:43',
      '2026-10-12T09:42',
    ])
    // Every event still points at a real run.
    const runIds = new Set(final.runs.map((r) => r.id))
    expect(final.events.every((e) => runIds.has(e.runId))).toBe(true)
  })
})

describe('reset', () => {
  it('restores exactly the original fixtures after a sequence of changes', () => {
    const changed = [
      { type: 'run/approve', runId: run(14) },
      { type: 'run/reject', runId: run(11), reason: GOOD_REASON },
      { type: 'exception/resolve', exceptionId: exc(2) },
    ].reduce((s, a) => payrollReducer(s, a as PayrollAction), createInitialState())
    expect(changed.events).toHaveLength(11)

    const reset = payrollReducer(changed, { type: 'demo/reset' })

    expect(reset).toEqual({ runs: payrollRuns, exceptions, events: activityEvents })
    expect(reset).toEqual(createInitialState())
  })

  it('never mutates the shared fixture arrays', () => {
    const before = JSON.stringify([payrollRuns, exceptions, activityEvents])
    ;[
      { type: 'run/approve', runId: run(14) },
      { type: 'exception/take', exceptionId: exc(4) },
    ].reduce((s, a) => payrollReducer(s, a as PayrollAction), createInitialState())

    expect(JSON.stringify([payrollRuns, exceptions, activityEvents])).toBe(before)
  })
})
