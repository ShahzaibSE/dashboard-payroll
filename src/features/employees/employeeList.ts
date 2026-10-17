import type { Country, Employee, Organization } from '@/fixtures'
import { PAGE_SIZE, type EmployeeListParams, type SortKey } from '@/features/employees/params'
import { createPlacement } from '@/lib/placement'

export type EmployeeRow = {
  id: string
  displayName: string
  jobTitle: string
  organization: string
  organizationId: string
  country: string
  countryCode: string
}

export type EmployeeListInput = { employees: Employee[]; organizations: Organization[]; countries: Country[] }

export type EmployeeList = {
  /** The people on the current page. */
  rows: EmployeeRow[]
  /** Everyone in the sample. */
  total: number
  /** Everyone who matches the filters. */
  matched: number
  page: number
  pageCount: number
  /** 1-based position of the first and last row shown, or 0 when there is none. */
  from: number
  to: number
  /** The filters that took effect: values that match nothing that exists are dropped, so the controls never disagree with the rows. */
  effective: EmployeeListParams
  options: { organizations: { id: string; name: string }[]; countries: { code: string; name: string }[] }
}

const compare: Record<SortKey, (a: EmployeeRow, b: EmployeeRow) => number> = {
  name: (a, b) => a.displayName.localeCompare(b.displayName),
  title: (a, b) => a.jobTitle.localeCompare(b.jobTitle),
  organization: (a, b) => a.organization.localeCompare(b.organization),
  country: (a, b) => a.country.localeCompare(b.country),
}

/**
 * Pure: joins each person to their organisation and country, applies the filters (all must match), sorts, and cuts one page.
 * Ties fall back to the person id, so equal URLs always give the same order. A page past the end shows the last page.
 * A person who points at a missing organisation or country is a data bug, so it throws.
 */
export function buildEmployeeList(input: EmployeeListInput, params: EmployeeListParams): EmployeeList {
  const placementOf = createPlacement(input.organizations, input.countries)
  const organizationName = new Map(input.organizations.map((o) => [o.id, o.name]))
  const countryName = new Map(input.countries.map((c) => [c.code, c.name]))

  const all = input.employees.map((e): EmployeeRow => {
    const placement = placementOf(e)
    return { id: e.id, displayName: e.displayName, jobTitle: e.jobTitle, organization: placement.organization, organizationId: e.organizationId, country: placement.country.name, countryCode: e.countryCode }
  })

  // Offer only organisations and countries that have people in the sample.
  const options = {
    organizations: [...new Set(all.map((r) => r.organizationId))].map((id) => ({ id, name: organizationName.get(id) as string })).sort((a, b) => a.name.localeCompare(b.name)),
    countries: [...new Set(all.map((r) => r.countryCode))].map((code) => ({ code, name: countryName.get(code) as string })).sort((a, b) => a.name.localeCompare(b.name)),
  }

  const org = options.organizations.some((o) => o.id === params.org) ? params.org : undefined
  const country = options.countries.some((c) => c.code === params.country) ? params.country : undefined
  const query = params.q.trim().toLowerCase()

  const matches = all
    .filter(
      (row) =>
        (!query || row.displayName.toLowerCase().includes(query) || row.jobTitle.toLowerCase().includes(query)) &&
        (!org || row.organizationId === org) &&
        (!country || row.countryCode === country),
    )
    .sort((a, b) => {
      const result = compare[params.sort](a, b) * (params.dir === 'desc' ? -1 : 1)
      return result || a.id.localeCompare(b.id)
    })

  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const page = Math.min(params.page, pageCount)
  const rows = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return {
    rows,
    total: all.length,
    matched: matches.length,
    page,
    pageCount,
    from: rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
    to: (page - 1) * PAGE_SIZE + rows.length,
    effective: { ...params, org, country, page },
    options,
  }
}
