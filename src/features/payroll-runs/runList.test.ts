import { describe, expect, it } from 'vitest'
import { countries, organizations, payrollRuns } from '@/fixtures'
import { parseRunListParams } from '@/features/payroll-runs/params'
import { buildRunList } from '@/features/payroll-runs/runList'

const input = { runs: payrollRuns, organizations, countries }
const ids = (query: string, source = input) =>
  buildRunList(source, parseRunListParams(new URLSearchParams(query))).rows.map((r) => r.id.slice(-3))

describe('buildRunList', () => {
  it('lists every run by pay date, then id, by default', () => {
    const list = buildRunList(input, parseRunListParams(new URLSearchParams()))

    expect(list.total).toBe(24)
    expect(list.rows).toHaveLength(24)
    // Pay days: run 003 on the 5th, 004 on the 7th, 005 on the 8th, then 001 and 002 tie on the 9th.
    expect(list.rows.slice(0, 5).map((r) => r.id.slice(-3))).toEqual(['003', '004', '005', '001', '002'])
  })

  it('joins organisation, country and region to each run', () => {
    const [first] = buildRunList(input, parseRunListParams(new URLSearchParams())).rows

    expect(first).toMatchObject({ organization: 'Lumen Foods Group', country: 'Philippines', region: 'APAC', status: 'paid' })
  })

  it.each([
    ['status', 'status=on_hold', ['023', '024']],
    ['country', 'country=DE', ['008', '012']],
    ['region', 'region=EMEA', ['006', '008', '009', '010', '011', '012', '015', '018', '019', '022', '024']],
    ['search on organisation', 'q=lumen', ['003', '009', '015', '021']],
    ['search on country', 'q=united%20arab', ['015', '022']],
    ['search on run id', 'q=run-2026-10-014', ['014']],
  ])('filters by %s', (_label, query, expected) => {
    expect(ids(`${query}&sort=updated&dir=asc`).sort()).toEqual(expected)
  })

  it('requires every filter to match', () => {
    expect(ids('status=pending_approval&region=EMEA')).toEqual(['010', '011', '012', '015'])
    expect(ids('status=pending_approval&region=EMEA&country=SG')).toEqual([])
  })

  it('ignores case and surrounding spaces in the search text', () => {
    expect(ids('q=%20%20LUMEN%20').sort()).toEqual(['003', '009', '015', '021'])
  })

  it('treats a whitespace-only search as no filter', () => {
    expect(ids('q=%20%20%20')).toHaveLength(24)
  })

  it('sorts numbers numerically and honours the direction', () => {
    expect(ids('sort=employees&dir=desc').slice(0, 3)).toEqual(['023', '003', '004'])
    expect(ids('sort=employees&dir=asc').slice(0, 2)).toEqual(['024', '018'])
  })

  it('sorts statuses in lifecycle order, not alphabetically', () => {
    const statuses = buildRunList(input, parseRunListParams(new URLSearchParams('sort=status'))).rows.map((r) => r.status)

    expect(statuses[0]).toBe('draft')
    expect(statuses[2]).toBe('in_review')
    expect(statuses.at(-1)).toBe('on_hold')
  })

  it('breaks ties by run id in ascending order, even when sorting descending', () => {
    // Runs 001 and 002 share a pay date, so they must keep id order in both directions.
    const desc = ids('sort=payDate&dir=desc')

    expect(desc.indexOf('001')).toBeLessThan(desc.indexOf('002'))
  })

  it('is deterministic: equal parameters give equal output', () => {
    expect(ids('sort=gross&dir=desc&region=APAC')).toEqual(ids('region=APAC&dir=desc&sort=gross'))
  })

  it('does not mutate the input', () => {
    const before = payrollRuns.map((r) => r.id)
    ids('sort=gross&dir=desc')

    expect(payrollRuns.map((r) => r.id)).toEqual(before)
  })

  it('fails loudly when a run references a missing organisation or country', () => {
    const noOrg = { ...input, organizations: organizations.slice(1) }
    const noCountry = { ...input, countries: countries.slice(1) }

    expect(() => ids('', noOrg)).toThrow(/Unknown organization/)
    expect(() => ids('', noCountry)).toThrow(/Unknown country/)
  })
})
