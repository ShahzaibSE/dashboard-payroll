import { describe, expect, it } from 'vitest'
import { activityEvents, countries, exceptions, organizations, payrollRuns } from '@/fixtures'

describe('payroll fixtures', () => {
  it('uses unique ids within each collection', () => {
    for (const items of [organizations, countries.map((c) => ({ id: c.code })), payrollRuns, exceptions, activityEvents]) {
      const ids = items.map((item) => item.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('only references records that exist', () => {
    const orgIds = new Set(organizations.map((o) => o.id))
    const countryCodes = new Set(countries.map((c) => c.code))
    const runIds = new Set(payrollRuns.map((r) => r.id))

    expect(payrollRuns.every((r) => orgIds.has(r.organizationId) && countryCodes.has(r.countryCode))).toBe(true)
    expect(exceptions.every((e) => runIds.has(e.runId))).toBe(true)
    expect(activityEvents.every((e) => runIds.has(e.runId))).toBe(true)
  })

  it('has at most one run per organisation and country for the period', () => {
    const keys = payrollRuns.map((r) => `${r.organizationId}/${r.countryCode}/${r.periodLabel}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps activity newest first and amounts positive whole numbers', () => {
    const times = activityEvents.map((e) => e.occurredAt)
    expect(times).toEqual([...times].sort().reverse())
    expect(payrollRuns.every((r) => Number.isInteger(r.grossUsd) && r.grossUsd > 0 && r.employeeCount > 0)).toBe(true)
  })

  it('produces fixed totals, so the data cannot drift unnoticed', () => {
    // Expected values were computed independently from the documented formula.
    expect(payrollRuns).toHaveLength(24)
    expect(payrollRuns.reduce((sum, r) => sum + r.employeeCount, 0)).toBe(3880)
    expect(payrollRuns.reduce((sum, r) => sum + r.grossUsd, 0)).toBe(14_390_060)
    expect(payrollRuns[0].grossUsd).toBe(845_184)
    expect(exceptions.filter((e) => e.status !== 'resolved')).toHaveLength(12)
  })
})
