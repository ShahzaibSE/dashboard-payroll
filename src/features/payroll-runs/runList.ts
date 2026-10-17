import type { Country, Organization, PayrollRun, Region, RunStatus } from '@/fixtures'
import { runStatusOrder } from '@/lib/payroll-status'
import type { RunListParams, SortKey } from '@/features/payroll-runs/params'
import { createPlacement } from '@/lib/placement'

export type RunListRow = {
  id: string
  organization: string
  country: string
  region: Region
  countryCode: string
  payDate: string
  employeeCount: number
  grossUsd: number
  status: RunStatus
  updatedOn: string
}

export type RunListInput = {
  runs: PayrollRun[]
  organizations: Organization[]
  countries: Country[]
}

export type RunList = { rows: RunListRow[]; total: number }

const statusRank = new Map(runStatusOrder.map((status, index) => [status, index]))

const compare: Record<SortKey, (a: RunListRow, b: RunListRow) => number> = {
  organization: (a, b) => a.organization.localeCompare(b.organization),
  country: (a, b) => a.country.localeCompare(b.country),
  payDate: (a, b) => a.payDate.localeCompare(b.payDate),
  employees: (a, b) => a.employeeCount - b.employeeCount,
  gross: (a, b) => a.grossUsd - b.grossUsd,
  status: (a, b) => (statusRank.get(a.status) ?? 0) - (statusRank.get(b.status) ?? 0),
  updated: (a, b) => a.updatedOn.localeCompare(b.updatedOn),
}

/**
 * Pure: joins runs to their organisation and country, applies the filters (all must match), then sorts.
 * Ties always fall back to the run id ascending, so the order is stable and the same for equal URLs.
 * A run that points at a missing organisation or country is a data bug, so it throws.
 */
export function buildRunList(input: RunListInput, params: RunListParams): RunList {
  const placementOf = createPlacement(input.organizations, input.countries)

  const all: RunListRow[] = input.runs.map((run) => {
    const { organization, country: c } = placementOf(run)
    return {
      id: run.id,
      organization,
      country: c.name,
      region: c.region,
      countryCode: c.code,
      payDate: run.payDate,
      employeeCount: run.employeeCount,
      grossUsd: run.grossUsd,
      status: run.status,
      updatedOn: run.updatedOn,
    }
  })

  const query = params.q.trim().toLowerCase()
  const rows = all
    .filter(
      (row) =>
        (!query || [row.organization, row.country, row.id].some((text) => text.toLowerCase().includes(query))) &&
        (!params.status || row.status === params.status) &&
        (!params.region || row.region === params.region) &&
        (!params.country || row.countryCode === params.country),
    )
    .sort((a, b) => {
      const result = compare[params.sort](a, b) * (params.dir === 'desc' ? -1 : 1)
      return result || a.id.localeCompare(b.id)
    })

  return { rows, total: all.length }
}
