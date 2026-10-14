import type { Country, ExceptionSeverity, ExceptionStatus, Organization, PayrollException, PayrollRun, Region } from '@/fixtures'
import { exceptionStatusOrder, severityOrder } from '@/lib/payroll-status'
import type { ExceptionListParams, SortKey } from '@/features/exceptions/params'
import { canResolve, canTake } from '@/state/payroll/transitions'
import type { PayrollState } from '@/state/payroll/types'

export type ExceptionRow = {
  id: string
  title: string
  severity: ExceptionSeverity
  status: ExceptionStatus
  raisedOn: string
  assignee?: string
  runId: string
  /** "Organisation · Country", the same label the Overview uses. */
  runLabel: string
  region: Region
  canTake: boolean
  canResolve: boolean
}

export type ExceptionListInput = { state: PayrollState; organizations: Organization[]; countries: Country[] }
export type ExceptionList = { rows: ExceptionRow[]; total: number; unresolved: number }

const severityRank = new Map(severityOrder.map((severity, index) => [severity, index]))
const statusRank = new Map(exceptionStatusOrder.map((status, index) => [status, index]))

const compare: Record<SortKey, (a: ExceptionRow, b: ExceptionRow) => number> = {
  severity: (a, b) => (severityRank.get(a.severity) ?? 0) - (severityRank.get(b.severity) ?? 0),
  status: (a, b) => (statusRank.get(a.status) ?? 0) - (statusRank.get(b.status) ?? 0),
  raised: (a, b) => a.raisedOn.localeCompare(b.raisedOn),
  run: (a, b) => a.runLabel.localeCompare(b.runLabel),
}

/**
 * Pure: joins each exception to its run, applies the filters (all must match), then sorts.
 * Ties fall back to oldest first, then id, so equal URLs always give the same order.
 * An exception that points at a missing run, organisation, or country is a data bug, so it throws.
 */
export function buildExceptionList(input: ExceptionListInput, params: ExceptionListParams): ExceptionList {
  const runById = new Map<string, PayrollRun>(input.state.runs.map((r) => [r.id, r]))
  const organizationName = new Map(input.organizations.map((o) => [o.id, o.name]))
  const country = new Map(input.countries.map((c) => [c.code, c]))

  const all = input.state.exceptions.map((e: PayrollException): ExceptionRow => {
    const run = runById.get(e.runId)
    if (!run) throw new Error(`Unknown run: ${e.runId}`)
    const organization = organizationName.get(run.organizationId)
    const c = country.get(run.countryCode)
    if (!organization) throw new Error(`Unknown organization: ${run.organizationId}`)
    if (!c) throw new Error(`Unknown country: ${run.countryCode}`)
    return {
      id: e.id,
      title: e.title,
      severity: e.severity,
      status: e.status,
      raisedOn: e.raisedOn,
      ...(e.assignee ? { assignee: e.assignee } : {}),
      runId: run.id,
      runLabel: `${organization} · ${c.name}`,
      region: c.region,
      canTake: canTake(input.state, e.id).allowed,
      canResolve: canResolve(input.state, e.id).allowed,
    }
  })

  const matchesStatus = (row: ExceptionRow) =>
    params.status === 'all' || (params.status === 'unresolved' ? row.status !== 'resolved' : row.status === params.status)

  const rows = all
    .filter((row) => matchesStatus(row) && (!params.severity || row.severity === params.severity) && (!params.region || row.region === params.region))
    .sort((a, b) => {
      const result = compare[params.sort](a, b) * (params.dir === 'desc' ? -1 : 1)
      return result || a.raisedOn.localeCompare(b.raisedOn) || a.id.localeCompare(b.id)
    })

  return { rows, total: all.length, unresolved: all.filter((row) => row.status !== 'resolved').length }
}
