import type { AuditKind, Country, Organization, PayrollRun } from '@/fixtures'
import { auditKindLabel, describeEvent } from '@/lib/audit'
import { formatEventTime } from '@/lib/format'
import type { AuditListParams } from '@/features/audit/params'
import type { PayrollState } from '@/state/payroll/types'

export type AuditInput = {
  /** ISO date treated as "today". */
  today: string
  state: PayrollState
  organizations: Organization[]
  countries: Country[]
}

export type AuditRow = {
  id: string
  occurredAt: string
  when: string
  actor: string
  kind: AuditKind
  kindLabel: string
  runId: string
  /** "Organisation · Country", the same label the Overview uses. */
  runLabel: string
  detail: string
  reason?: string
}

export type AuditList = {
  rows: AuditRow[]
  total: number
  /** The filters that took effect: values that match nothing that exists are dropped, so the controls never disagree with the rows. */
  effective: AuditListParams
  /** What the filters can offer: only runs and actors that appear in the audit trail. */
  options: { runs: { id: string; label: string }[]; actors: string[] }
}

/**
 * Pure: the audit trail, newest first, joined to run labels, with the filters applied (all must match).
 * A reference to a missing run, organisation, or country is a data bug, so it throws.
 */
export function buildAuditList(input: AuditInput, params: AuditListParams): AuditList {
  const runById = new Map<string, PayrollRun>(input.state.runs.map((r) => [r.id, r]))
  const organizationName = new Map(input.organizations.map((o) => [o.id, o.name]))
  const country = new Map(input.countries.map((c) => [c.code, c]))

  const labelOf = (runId: string) => {
    const run = runById.get(runId)
    if (!run) throw new Error(`Unknown run: ${runId}`)
    const organization = organizationName.get(run.organizationId)
    const c = country.get(run.countryCode)
    if (!organization) throw new Error(`Unknown organization: ${run.organizationId}`)
    if (!c) throw new Error(`Unknown country: ${run.countryCode}`)
    return `${organization} · ${c.name}`
  }

  const all = [...input.state.events]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
    .map((event): AuditRow => ({
      id: event.id,
      occurredAt: event.occurredAt,
      when: formatEventTime(input.today, event.occurredAt),
      actor: event.actor,
      kind: event.kind,
      kindLabel: auditKindLabel[event.kind],
      runId: event.runId,
      runLabel: labelOf(event.runId),
      detail: describeEvent(event.action),
      ...(event.reason ? { reason: event.reason } : {}),
    }))

  const runs = [...new Map(all.map((row) => [row.runId, row.runLabel])).entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
  const actors = [...new Set(all.map((row) => row.actor))].sort((a, b) => a.localeCompare(b))

  const effective: AuditListParams = {
    kind: params.kind,
    run: runs.some((r) => r.id === params.run) ? params.run : undefined,
    actor: actors.includes(params.actor ?? '') ? params.actor : undefined,
  }

  const rows = all.filter(
    (row) => (!effective.kind || row.kind === effective.kind) && (!effective.run || row.runId === effective.run) && (!effective.actor || row.actor === effective.actor),
  )

  return { rows, total: all.length, effective, options: { runs, actors } }
}
