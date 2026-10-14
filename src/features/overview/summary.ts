import type {
  ActivityEvent,
  Country,
  ExceptionSeverity,
  Organization,
  PayrollException,
  PayrollRun,
  Region,
  RunStatus,
} from '@/fixtures'
import { daysBetween, formatEventTime, formatShortDate, relativeDays } from '@/lib/format'
import { runStatusOrder } from '@/lib/payroll-status'

export type OverviewInput = {
  /** ISO date treated as "today". */
  today: string
  organizations: Organization[]
  countries: Country[]
  runs: PayrollRun[]
  exceptions: PayrollException[]
  events: ActivityEvent[]
}

export type AttentionItem = {
  id: string
  title: string
  detail: string
  href: string
  severity?: ExceptionSeverity
}

export type RunRow = {
  id: string
  organization: string
  country: string
  payDate: string
  employeeCount: number
  grossUsd: number
  status: RunStatus
}

export type ActivityRow = { id: string; occurredAt: string; when: string; actor: string; action: string; runId: string; runLabel: string }

export type CountryTotal = { code: string; name: string; label: string; region: Region; grossUsd: number }

export type Overview = {
  awaitingApproval: { count: number; earliestPayDate: string | null }
  unresolvedExceptions: { count: number; critical: number; high: number }
  paymentsDue: { windowDays: number; count: number; grossUsd: number }
  cycle: { periodLabel: string; runs: number; employees: number; grossUsd: number }
  attention: { awaitingApproval: AttentionItem[]; criticalExceptions: AttentionItem[]; onHold: AttentionItem[] }
  statusCounts: { status: RunStatus; count: number }[]
  countryTotals: CountryTotal[]
  regionTotals: Record<Region, number>
  recentRuns: RunRow[]
  activity: ActivityRow[]
}

export const PAYMENT_WINDOW_DAYS = 7
const RECENT_RUN_LIMIT = 6
const ACTIVITY_LIMIT = 6

const byDateThenId = <T extends { id: string }>(date: (item: T) => string) => (a: T, b: T) =>
  date(a).localeCompare(date(b)) || a.id.localeCompare(b.id)

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

/** A reference to a record that does not exist is a bug in the data, so fail loudly instead of dropping it. */
function mustFind<T>(lookup: Map<string, T>, key: string, kind: string): T {
  const found = lookup.get(key)
  if (!found) throw new Error(`Unknown ${kind}: ${key}`)
  return found
}

/**
 * Pure: derives everything the Overview shows from plain records.
 * It describes one pay period: `cycle.periodLabel` is taken from the first run.
 *
 * A reference to a missing record is a bug in the data, so it throws. It does so when the record is needed:
 * every run's country (for the country totals), and the organisation, run, or country of anything the page
 * displays (listed runs, critical exceptions, and the newest activity events). References in records that are
 * not displayed, such as older events or non-critical exceptions, are not checked here; `fixtures.test.ts`
 * checks all fixture references.
 */
export function buildOverview(input: OverviewInput): Overview {
  const { today, runs, exceptions } = input
  const organizationName = new Map(input.organizations.map((o) => [o.id, o.name]))
  const country = new Map(input.countries.map((c) => [c.code, c]))
  const runById = new Map(runs.map((r) => [r.id, r]))

  const countryName = (run: PayrollRun) => mustFind(country, run.countryCode, 'country').name
  const organizationOf = (run: PayrollRun) => mustFind(organizationName, run.organizationId, 'organization')
  const runLabel = (run: PayrollRun) => `${organizationOf(run)} · ${countryName(run)}`
  const payDateDetail = (run: PayrollRun) => `Pay date ${formatShortDate(run.payDate)} (${relativeDays(today, run.payDate)})`

  const pending = runs.filter((r) => r.status === 'pending_approval').sort(byDateThenId((r) => r.payDate))
  const unresolved = exceptions.filter((e) => e.status !== 'resolved')
  const dueSoon = runs.filter((r) => {
    const days = daysBetween(today, r.payDate)
    return r.status !== 'paid' && days >= 0 && days <= PAYMENT_WINDOW_DAYS
  })

  const exceptionItem = (e: PayrollException): AttentionItem => {
    return { id: e.id, title: e.title, detail: runLabel(mustFind(runById, e.runId, 'run')), href: '/exceptions', severity: e.severity }
  }
  const runItem = (run: PayrollRun, extra = ''): AttentionItem => ({
    id: run.id,
    title: runLabel(run),
    detail: `${payDateDetail(run)}${extra}`,
    href: `/payroll-runs/${run.id}`,
  })

  const countryGross = new Map<string, number>()
  for (const run of runs) countryGross.set(run.countryCode, (countryGross.get(run.countryCode) ?? 0) + run.grossUsd)
  const countryTotals: CountryTotal[] = [...countryGross.entries()]
    .map(([code, grossUsd]) => {
      const c = mustFind(country, code, 'country')
      return { code, name: c.name, label: c.shortName ?? c.name, region: c.region, grossUsd }
    })
    .sort((a, b) => b.grossUsd - a.grossUsd || a.name.localeCompare(b.name))

  const regionTotals: Record<Region, number> = { APAC: 0, EMEA: 0 }
  for (const total of countryTotals) regionTotals[total.region] += total.grossUsd

  return {
    awaitingApproval: { count: pending.length, earliestPayDate: pending[0]?.payDate ?? null },
    unresolvedExceptions: {
      count: unresolved.length,
      critical: unresolved.filter((e) => e.severity === 'critical').length,
      high: unresolved.filter((e) => e.severity === 'high').length,
    },
    paymentsDue: { windowDays: PAYMENT_WINDOW_DAYS, count: dueSoon.length, grossUsd: sum(dueSoon.map((r) => r.grossUsd)) },
    cycle: {
      periodLabel: runs[0]?.periodLabel ?? '',
      runs: runs.length,
      employees: sum(runs.map((r) => r.employeeCount)),
      grossUsd: sum(runs.map((r) => r.grossUsd)),
    },
    attention: {
      awaitingApproval: pending.map((r) => runItem(r, ` · ${r.employeeCount} employees`)),
      criticalExceptions: unresolved
        .filter((e) => e.severity === 'critical')
        .sort((a, b) => b.raisedOn.localeCompare(a.raisedOn) || a.id.localeCompare(b.id))
        .map(exceptionItem),
      onHold: runs
        .filter((r) => r.status === 'on_hold')
        .sort(byDateThenId((r) => r.payDate))
        .map((r) => runItem(r)),
    },
    statusCounts: runStatusOrder.map((status) => ({ status, count: runs.filter((r) => r.status === status).length })),
    countryTotals,
    regionTotals,
    recentRuns: [...runs]
      .sort((a, b) => b.updatedOn.localeCompare(a.updatedOn) || a.id.localeCompare(b.id))
      .slice(0, RECENT_RUN_LIMIT)
      .map((r) => ({
        id: r.id,
        organization: organizationOf(r),
        country: countryName(r),
        payDate: r.payDate,
        employeeCount: r.employeeCount,
        grossUsd: r.grossUsd,
        status: r.status,
      })),
    activity: [...input.events]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id))
      .slice(0, ACTIVITY_LIMIT)
      .map((e) => ({
        id: e.id,
        occurredAt: e.occurredAt,
        when: formatEventTime(today, e.occurredAt),
        actor: e.actor,
        action: e.action,
        runId: e.runId,
        runLabel: runLabel(mustFind(runById, e.runId, 'run')),
      })),
  }
}
