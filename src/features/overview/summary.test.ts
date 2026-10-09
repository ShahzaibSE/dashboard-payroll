import { describe, expect, it } from 'vitest'
import { activityEvents, countries, exceptions, organizations, payrollRuns, REFERENCE_DATE } from '@/fixtures'
import { buildOverview, type OverviewInput } from '@/features/overview/summary'

const input: OverviewInput = {
  today: REFERENCE_DATE,
  organizations,
  countries,
  runs: payrollRuns,
  exceptions,
  events: activityEvents,
}
const overview = buildOverview(input)

describe('buildOverview', () => {
  it('counts runs awaiting approval and finds the earliest pay date', () => {
    expect(overview.awaitingApproval).toEqual({ count: 6, earliestPayDate: '2026-10-14' })
  })

  it('counts only unresolved exceptions and breaks out the urgent ones', () => {
    expect(overview.unresolvedExceptions).toEqual({ count: 12, critical: 3, high: 4 })
  })

  it('totals unpaid runs due within the next 7 days, including today', () => {
    expect(overview.paymentsDue).toEqual({ windowDays: 7, count: 7, grossUsd: 4_959_200 })
  })

  it('totals the whole pay period', () => {
    expect(overview.cycle).toEqual({ periodLabel: 'October 2026', runs: 24, employees: 3880, grossUsd: 14_390_060 })
  })

  it('lists every status in lifecycle order, including those with no runs', () => {
    expect(overview.statusCounts.map((s) => s.status)).toEqual(['draft', 'in_review', 'pending_approval', 'approved', 'paid', 'on_hold'])
    expect(overview.statusCounts.map((s) => s.count)).toEqual([2, 5, 6, 3, 6, 2])
    const empty = buildOverview({ ...input, runs: [], exceptions: [], events: [] })
    expect(empty.statusCounts.every((s) => s.count === 0)).toBe(true)
  })

  it('orders countries by gross payroll and splits totals by region', () => {
    expect(overview.countryTotals.map((c) => c.code).slice(0, 3)).toEqual(['FR', 'AU', 'GB'])
    expect(overview.countryTotals[0]).toMatchObject({ name: 'France', grossUsd: 2_439_840, region: 'EMEA' })
    expect(overview.regionTotals).toEqual({ APAC: 7_716_248, EMEA: 6_673_812 })
    expect(overview.regionTotals.APAC + overview.regionTotals.EMEA).toBe(overview.cycle.grossUsd)
    expect(overview.countryTotals.find((c) => c.code === 'AE')?.label).toBe('UAE')
  })

  it('puts the soonest pay date first in the approval list and links to the run', () => {
    const [first, second] = overview.attention.awaitingApproval
    expect(overview.attention.awaitingApproval).toHaveLength(6)
    expect(first).toMatchObject({
      id: 'run-2026-10-010',
      title: 'Orchard Row Retail · United Kingdom',
      detail: 'Pay date 14 Oct (in 2 days) · 318 employees',
      href: '/payroll-runs/run-2026-10-010',
    })
    expect(second.id).toBe('run-2026-10-011')
  })

  it('lists critical exceptions newest first and runs on hold by pay date', () => {
    expect(overview.attention.criticalExceptions.map((i) => i.id)).toEqual(['exc-001', 'exc-002', 'exc-011'])
    expect(overview.attention.criticalExceptions.every((i) => i.severity === 'critical')).toBe(true)
    expect(overview.attention.onHold.map((i) => i.id)).toEqual(['run-2026-10-024', 'run-2026-10-023'])
  })

  it('shows the most recently updated runs, with ties broken by id', () => {
    expect(overview.recentRuns).toHaveLength(6)
    expect(overview.recentRuns.map((r) => r.id)).toEqual([
      'run-2026-10-009',
      'run-2026-10-010',
      'run-2026-10-011',
      'run-2026-10-013',
      'run-2026-10-016',
      'run-2026-10-019',
    ])
  })

  it('keeps the newest six activity events and resolves their run names', () => {
    expect(overview.activity).toHaveLength(6)
    expect(overview.activity[0]).toMatchObject({
      actor: 'Lucas Brandt',
      when: 'Today, 09:41 UTC',
      runLabel: 'Orchard Row Retail · United Kingdom',
    })
    expect(overview.activity[4].when).toBe('11 Oct, 17:48 UTC')
  })

  it('handles an empty period without failing', () => {
    const empty = buildOverview({ ...input, runs: [], exceptions: [], events: [] })
    expect(empty.awaitingApproval).toEqual({ count: 0, earliestPayDate: null })
    expect(empty.cycle).toMatchObject({ runs: 0, employees: 0, grossUsd: 0 })
    expect(empty.attention.awaitingApproval).toEqual([])
  })

  describe('payments due window', () => {
    const base = payrollRuns[6]
    const due = (id: string, payDate: string, status = base.status) => ({ ...base, id, payDate, status })
    const count = (runs: typeof payrollRuns) => buildOverview({ ...input, runs, exceptions: [], events: [] }).paymentsDue.count

    it('includes today and day 7, and excludes yesterday and day 8', () => {
      expect(count([due('a', '2026-10-12')])).toBe(1)
      expect(count([due('b', '2026-10-19')])).toBe(1)
      expect(count([due('c', '2026-10-20')])).toBe(0)
      expect(count([due('d', '2026-10-11')])).toBe(0)
    })

    it('ignores runs that are already paid', () => {
      expect(count([due('e', '2026-10-14', 'paid')])).toBe(0)
    })
  })

  it('does not count resolved exceptions', () => {
    const open = buildOverview({ ...input, exceptions: exceptions.filter((e) => e.status !== 'resolved') })
    expect(open.unresolvedExceptions).toEqual(overview.unresolvedExceptions)
  })

  it('shows the newest activity first even when the input is not sorted', () => {
    const shuffled = buildOverview({ ...input, events: [...activityEvents].reverse() })
    expect(shuffled.activity.map((a) => a.id)).toEqual(overview.activity.map((a) => a.id))
  })

  it('fails loudly on a reference to a record that does not exist', () => {
    const badCountry = { ...payrollRuns[0], countryCode: 'ZZ' }
    expect(() => buildOverview({ ...input, runs: [badCountry], exceptions: [], events: [] })).toThrow('Unknown country: ZZ')
    const badOrg = { ...payrollRuns[0], organizationId: 'org-missing' }
    expect(() => buildOverview({ ...input, runs: [badOrg], exceptions: [], events: [] })).toThrow('Unknown organization: org-missing')
    // Built to be the newest event explicitly, so it is displayed whatever order the fixtures are in.
    const newestDangling = { ...activityEvents[0], id: 'evt-dangling', occurredAt: '2099-01-01T00:00', runId: 'run-missing' }
    expect(() => buildOverview({ ...input, events: [...activityEvents, newestDangling] })).toThrow('Unknown run: run-missing')
  })

  it('does not depend on the real clock', () => {
    const later = buildOverview({ ...input, today: '2026-10-26' })
    expect(later.paymentsDue.count).toBe(5)
    expect(later.paymentsDue.count).not.toBe(overview.paymentsDue.count)
    expect(buildOverview(input)).toEqual(overview)
  })
})
