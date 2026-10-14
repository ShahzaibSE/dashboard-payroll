import type { Country, ExceptionSeverity, ExceptionStatus, Organization, PayrollRun, Region, RunStatus } from '@/fixtures'
import { describeEvent } from '@/lib/audit'
import { formatEventTime, relativeDays } from '@/lib/format'
import { severityOrder } from '@/lib/payroll-status'
import { canApprove, canReject, canResolve, canSubmit, canTake, type Eligibility } from '@/state/payroll/transitions'
import type { PayrollState } from '@/state/payroll/types'

export type RunDetailInput = {
  /** ISO date treated as "today". */
  today: string
  state: PayrollState
  organizations: Organization[]
  countries: Country[]
}

export type RunExceptionRow = {
  id: string
  title: string
  severity: ExceptionSeverity
  status: ExceptionStatus
  raisedOn: string
  assignee?: string
  /** What the workflow allows right now, from the same guards the reducer enforces. */
  canTake: boolean
  canResolve: boolean
}

export type TimelineRow = { id: string; occurredAt: string; when: string; actor: string; text: string; reason?: string }

export type RunDetail = {
  id: string
  organization: string
  country: string
  region: Region
  currency: string
  periodLabel: string
  payDate: string
  payDateRelative: string
  status: RunStatus
  employeeCount: number
  grossUsd: number
  averageUsd: number
  updatedOn: string
  exceptions: RunExceptionRow[]
  unresolvedCritical: number
  /** Run-level decisions the workflow allows right now, with the reason when it does not. */
  decisions: { submit: Eligibility; approve: Eligibility; reject: Eligibility }
  timeline: TimelineRow[]
}

export { describeEvent }

const severityRank = new Map(severityOrder.map((severity, index) => [severity, index]))

/**
 * Pure: everything the run page shows, derived from the shared state and static reference data.
 * Returns null for an id that does not exist. A run whose organisation or country is missing is a data bug, so it throws.
 */
export function buildRunDetail(input: RunDetailInput, runId: string): RunDetail | null {
  const run: PayrollRun | undefined = input.state.runs.find((r) => r.id === runId)
  if (!run) return null
  const organization = input.organizations.find((o) => o.id === run.organizationId)
  const country = input.countries.find((c) => c.code === run.countryCode)
  if (!organization) throw new Error(`Unknown organization: ${run.organizationId}`)
  if (!country) throw new Error(`Unknown country: ${run.countryCode}`)

  const exceptions = input.state.exceptions
    .filter((e) => e.runId === runId)
    .sort((a, b) => (severityRank.get(a.severity) ?? 0) - (severityRank.get(b.severity) ?? 0) || a.raisedOn.localeCompare(b.raisedOn) || a.id.localeCompare(b.id))
    .map(
      (e): RunExceptionRow => ({
        id: e.id,
        title: e.title,
        severity: e.severity,
        status: e.status,
        raisedOn: e.raisedOn,
        ...(e.assignee ? { assignee: e.assignee } : {}),
        canTake: canTake(input.state, e.id).allowed,
        canResolve: canResolve(input.state, e.id).allowed,
      }),
    )

  const timeline = input.state.events
    .filter((e) => e.runId === runId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
    .map((e): TimelineRow => ({
      id: e.id,
      occurredAt: e.occurredAt,
      when: formatEventTime(input.today, e.occurredAt),
      actor: e.actor,
      text: describeEvent(e.action),
      ...(e.reason ? { reason: e.reason } : {}),
    }))

  return {
    id: run.id,
    organization: organization.name,
    country: country.name,
    region: country.region,
    currency: country.currency,
    periodLabel: run.periodLabel,
    payDate: run.payDate,
    payDateRelative: relativeDays(input.today, run.payDate),
    status: run.status,
    employeeCount: run.employeeCount,
    grossUsd: run.grossUsd,
    averageUsd: Math.round(run.grossUsd / run.employeeCount),
    updatedOn: run.updatedOn,
    exceptions,
    unresolvedCritical: exceptions.filter((e) => e.severity === 'critical' && e.status !== 'resolved').length,
    decisions: { submit: canSubmit(input.state, runId), approve: canApprove(input.state, runId), reject: canReject(input.state, runId) },
    timeline,
  }
}
