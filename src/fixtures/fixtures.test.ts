import { describe, expect, it } from 'vitest'
import { activityEvents, countries, employees, exceptions, organizations, payrollRuns } from '@/fixtures'

describe('payroll fixtures', () => {
  it('uses unique ids within each collection', () => {
    for (const items of [organizations, countries.map((c) => ({ id: c.code })), payrollRuns, exceptions, activityEvents, employees]) {
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

  it('gives every event a kind and every in-progress exception an assignee, and no one else', () => {
    expect(activityEvents.every((e) => typeof e.kind === 'string' && e.reason === undefined)).toBe(true)
    expect(exceptions.filter((e) => e.status === 'in_progress').every((e) => Boolean(e.assignee))).toBe(true)
    expect(exceptions.filter((e) => e.status !== 'in_progress').every((e) => e.assignee === undefined)).toBe(true)
  })

  it('numbers events evt-NNN so the next id can be derived from the highest one', () => {
    expect(activityEvents.every((e) => /^evt-\d{3}$/.test(e.id))).toBe(true)
  })

  describe('sample employees', () => {
    it('is a small fixed sample: four people for every organisation and country with a run', () => {
      expect(employees).toHaveLength(96)
      const perPair = new Map<string, number>()
      for (const e of employees) perPair.set(`${e.organizationId}/${e.countryCode}`, (perPair.get(`${e.organizationId}/${e.countryCode}`) ?? 0) + 1)
      const runPairs = new Set(payrollRuns.map((r) => `${r.organizationId}/${r.countryCode}`))
      expect(new Set(perPair.keys())).toEqual(runPairs)
      expect([...perPair.values()].every((n) => n === 4)).toBe(true)
    })

    it('only references organisations and countries that exist', () => {
      const orgIds = new Set(organizations.map((o) => o.id))
      const codes = new Set(countries.map((c) => c.code))

      expect(employees.every((e) => orgIds.has(e.organizationId) && codes.has(e.countryCode))).toBe(true)
    })

    it('has unique names, none shared with the people who act in the audit trail', () => {
      const names = employees.map((e) => e.displayName)
      expect(new Set(names).size).toBe(names.length)
      const actors = new Set(activityEvents.map((e) => e.actor))
      expect(names.some((n) => actors.has(n))).toBe(false)
    })

    it('holds nothing but an id, a name, an organisation, a country, and a job title, and no link to a run', () => {
      for (const e of employees) expect(Object.keys(e).sort()).toEqual(['countryCode', 'displayName', 'id', 'jobTitle', 'organizationId'])
    })

    it('is deterministic', () => {
      expect(employees[0]).toEqual({ id: 'emp-001', displayName: 'Aiko Alderwick', organizationId: 'org-harborvale', countryCode: 'SG', jobTitle: 'Payroll analyst' })
      expect(employees.at(-1)).toMatchObject({ id: 'emp-096', organizationId: 'org-quillon', countryCode: 'FR' })
    })
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
