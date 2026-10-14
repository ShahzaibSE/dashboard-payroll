import { describe, expect, it } from 'vitest'
import { countries, employees, organizations } from '@/fixtures'
import { buildEmployeeList } from '@/features/employees/employeeList'
import { parseEmployeeListParams } from '@/features/employees/params'

const build = (query = '') => buildEmployeeList({ employees, organizations, countries }, parseEmployeeListParams(new URLSearchParams(query)))
const ids = (query = '') => build(query).rows.map((r) => r.id)

describe('buildEmployeeList', () => {
  it('shows the first page of the sample, by name', () => {
    const list = build()

    expect(list.total).toBe(96)
    expect(list.matched).toBe(96)
    expect(list.rows).toHaveLength(25)
    expect([list.page, list.pageCount, list.from, list.to]).toEqual([1, 4, 1, 25])
    const names = list.rows.map((r) => r.displayName)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('joins organisation and country names, and carries no run information', () => {
    const row = build('q=aiko%20alderwick').rows[0]

    expect(row).toEqual({
      id: 'emp-001',
      displayName: 'Aiko Alderwick',
      jobTitle: 'Payroll analyst',
      organization: 'Harborvale Logistics',
      organizationId: 'org-harborvale',
      country: 'Singapore',
      countryCode: 'SG',
    })
  })

  it('cuts pages of 25 and a shorter last page, with the right positions', () => {
    expect(['2', '3', '4'].map((page) => { const l = build(`page=${page}`); return [l.page, l.rows.length, l.from, l.to] })).toEqual([
      [2, 25, 26, 50],
      [3, 25, 51, 75],
      [4, 21, 76, 96],
    ])
    const all = [1, 2, 3, 4].flatMap((page) => ids(`page=${page}`))
    expect(all).toHaveLength(96)
    expect(new Set(all).size).toBe(96)
  })

  it('brings an out-of-range page back to the last page', () => {
    const list = build('page=99')

    expect([list.page, list.from, list.to, list.effective.page]).toEqual([4, 76, 96, 4])
  })

  it.each([
    ['organisation', 'org=org-lumen', 16],
    ['country', 'country=SG', 12],
    ['a smaller country', 'country=JP', 8],
    ['organisation and country', 'org=org-harborvale&country=SG', 4],
    ['a pair with no people', 'org=org-harborvale&country=JP', 0],
    ['name', 'q=aiko', 6],
    ['name, ignoring case and padding', 'q=%20AIKO%20', 6],
    ['full name', 'q=aiko%20alderwick', 1],
    ['job title', 'q=payroll%20analyst', 8],
    // 'analyst' matches both Payroll analyst and Data analyst; Lumen's four organisation-and-country pairs each include one Data analyst.
    ['search and organisation together', 'q=analyst&org=org-lumen', 4],
  ])('filters by %s', (_label, query, count) => {
    expect(build(query).matched).toBe(count)
  })

  it('treats a whitespace-only search as no filter', () => {
    expect(build('q=%20%20%20').matched).toBe(96)
  })

  it('drops an organisation or country that does not exist, so the controls and rows agree', () => {
    const list = build('org=org-nope&country=ZZ')

    expect(list.effective).toMatchObject({ org: undefined, country: undefined })
    expect(list.matched).toBe(96)
  })

  it('offers every organisation and country, by name', () => {
    const { options } = build()

    expect(options.organizations.map((o) => o.name)).toEqual(['Harborvale Logistics', 'Kestrel Analytics', 'Lumen Foods Group', 'Orchard Row Retail', 'Quillon Labs', 'Tidewater Health'])
    expect(options.countries).toHaveLength(10)
  })

  it('sorts by each column in both directions, with ties broken by id', () => {
    const byCountry = build('sort=country&dir=asc').rows.map((r) => r.country)
    expect(byCountry).toEqual([...byCountry].sort((a, b) => a.localeCompare(b)))
    expect(build('sort=country&dir=desc').rows[0].country).toBe('United Kingdom')
    const titles = build('sort=title&dir=asc').rows.map((r) => r.jobTitle)
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)))
    // Everyone in one organisation and country has a different title, but within a title the order is by id.
    const analysts = build('q=payroll%20analyst&sort=title').rows.map((r) => r.id)
    expect(analysts).toEqual([...analysts].sort())
    expect(build('sort=organization&dir=desc').rows[0].organization).toBe('Tidewater Health')
  })

  it('is deterministic, covers each person once across the sort, and does not mutate the fixtures', () => {
    const before = JSON.stringify(employees)

    expect(ids('sort=title&dir=desc&page=2')).toEqual(ids('page=2&dir=desc&sort=title'))
    expect([1, 2, 3, 4].flatMap((page) => ids(`sort=title&page=${page}`)).sort()).toEqual(employees.map((e) => e.id).sort())
    expect(JSON.stringify(employees)).toBe(before)
  })

  it('shows an empty page and no positions when nothing matches', () => {
    const list = build('q=zzzz')

    expect([list.matched, list.rows.length, list.from, list.to, list.page, list.pageCount]).toEqual([0, 0, 0, 0, 1, 1])
  })

  it('fails loudly on a missing organisation or country', () => {
    const run = (orgs = organizations, ctrs = countries) => buildEmployeeList({ employees, organizations: orgs, countries: ctrs }, parseEmployeeListParams(new URLSearchParams()))

    expect(() => run([])).toThrow(/Unknown organization/)
    expect(() => run(organizations, [])).toThrow(/Unknown country/)
  })
})
