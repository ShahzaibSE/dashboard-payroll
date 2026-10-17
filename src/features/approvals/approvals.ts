import type { AuditKind, Country, Organization, PayrollRun } from '@/fixtures'
import { formatEventTime, relativeDays } from '@/lib/format'
import { unresolvedCriticalCount } from '@/state/payroll/transitions'
import type { PayrollState } from '@/state/payroll/types'
import { createPlacement } from '@/lib/placement'

export type ApprovalsInput = {
  /** ISO date treated as "today". */
  today: string
  state: PayrollState
  organizations: Organization[]
  countries: Country[]
}

export type QueueRow = {
  id: string
  /** "Organisation · Country", the same label the Overview uses. */
  runLabel: string
  payDate: string
  payDateRelative: string
  employeeCount: number
  grossUsd: number
  /** Unresolved critical exceptions; approval is blocked while this is above zero. */
  blockers: number
}

export type DecisionRow = {
  id: string
  occurredAt: string
  when: string
  actor: string
  outcome: 'Approved' | 'Rejected'
  runId: string
  runLabel: string
  reason?: string
}

export type Approvals = { queue: QueueRow[]; decisions: DecisionRow[] }

const DECISION_KINDS: Partial<Record<AuditKind, DecisionRow['outcome']>> = { 'run.approved': 'Approved', 'run.rejected': 'Rejected' }

/**
 * Pure: the approval queue (runs awaiting approval, earliest pay date first) and the decisions recorded in the audit trail
 * (newest first). Both come from the shared workflow state, so a decision made on a run page appears here immediately.
 * A reference to a missing run, organisation, or country is a data bug, so it throws.
 */
export function buildApprovals(input: ApprovalsInput): Approvals {
  const runById = new Map<string, PayrollRun>(input.state.runs.map((r) => [r.id, r]))
  const placementOf = createPlacement(input.organizations, input.countries)
  const labelOf = (run: PayrollRun) => placementOf(run).label

  const queue = input.state.runs
    .filter((run) => run.status === 'pending_approval')
    .sort((a, b) => a.payDate.localeCompare(b.payDate) || a.id.localeCompare(b.id))
    .map((run): QueueRow => ({
      id: run.id,
      runLabel: labelOf(run),
      payDate: run.payDate,
      payDateRelative: relativeDays(input.today, run.payDate),
      employeeCount: run.employeeCount,
      grossUsd: run.grossUsd,
      blockers: unresolvedCriticalCount(input.state, run.id),
    }))

  const decisions = input.state.events
    .filter((event) => event.kind in DECISION_KINDS)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
    .map((event): DecisionRow => {
      const run = runById.get(event.runId)
      if (!run) throw new Error(`Unknown run: ${event.runId}`)
      return {
        id: event.id,
        occurredAt: event.occurredAt,
        when: formatEventTime(input.today, event.occurredAt),
        actor: event.actor,
        outcome: DECISION_KINDS[event.kind] as DecisionRow['outcome'],
        runId: run.id,
        runLabel: labelOf(run),
        ...(event.reason ? { reason: event.reason } : {}),
      }
    })

  return { queue, decisions }
}
