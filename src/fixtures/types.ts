export type Region = 'APAC' | 'EMEA'

export type RunStatus = 'draft' | 'in_review' | 'pending_approval' | 'approved' | 'paid' | 'on_hold'

export type ExceptionSeverity = 'critical' | 'high' | 'medium' | 'low'
export type ExceptionStatus = 'open' | 'in_progress' | 'resolved'

export type Country = {
  code: string
  name: string
  /** Optional compact name for tight spaces such as chart axes. */
  shortName?: string
  region: Region
  currency: string
}
export type Organization = { id: string; name: string }

/**
 * A fictional person in the sample directory. It is tied to an organisation and a country only: nothing here says which
 * payroll run a person is paid in, and there is deliberately no pay, bank, tax, birth, contact, or address information.
 */
export type Employee = {
  id: string
  displayName: string
  organizationId: string
  countryCode: string
  jobTitle: string
}

export type PayrollRun = {
  id: string
  organizationId: string
  countryCode: string
  /** Human label of the pay period, for example "October 2026". */
  periodLabel: string
  /** ISO date (YYYY-MM-DD). */
  payDate: string
  status: RunStatus
  employeeCount: number
  /** Total gross cost converted at a fixed synthetic rate, in whole US dollars. */
  grossUsd: number
  /** ISO date of the last change. */
  updatedOn: string
}

export type PayrollException = {
  id: string
  runId: string
  severity: ExceptionSeverity
  status: ExceptionStatus
  title: string
  /** ISO date. */
  raisedOn: string
  /** Who is working on it. Set exactly when the status is `in_progress`; a resolved exception drops its assignee. */
  assignee?: string
}

/** Machine-readable meaning of an audit event; `action` stays the human sentence. */
export type AuditKind =
  | 'run.submitted'
  | 'run.approved'
  | 'run.rejected'
  | 'run.held'
  | 'run.paid'
  | 'run.reviewed'
  | 'run.recalculated'
  | 'exception.raised'
  | 'exception.taken'
  | 'exception.resolved'

export type ActivityEvent = {
  id: string
  /** ISO date and minute in UTC, for example 2026-10-12T09:41. */
  occurredAt: string
  actor: string
  /** What happened, as a verb phrase that follows the actor. */
  action: string
  runId: string
  kind: AuditKind
  /** Why a run was sent back; present only on `run.rejected`. */
  reason?: string
}
