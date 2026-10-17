import * as z from 'zod/mini'
import { countries } from '@/fixtures'
import { runStatusOrder } from '@/lib/payroll-status'

export const sortKeys = ['organization', 'country', 'payDate', 'employees', 'gross', 'status', 'updated'] as const
export type SortKey = (typeof sortKeys)[number]

export const MAX_QUERY_LENGTH = 80
export const DEFAULT_SORT: SortKey = 'payDate'

const [firstStatus, ...otherStatuses] = runStatusOrder
const [firstCountry, ...otherCountries] = countries.map((c) => c.code)

/**
 * The URL is untrusted input. Each parameter is validated on its own and falls back to "not set" or the default,
 * so one bad value never discards the others and nothing here can throw.
 * `zod/mini` is used because the full build adds about 26 kB gzipped to a bundle that is otherwise ~209 kB (about +8 kB with `zod/mini`).
 */
const paramsSchema = z.object({
  q: z.catch(z.string().check(z.overwrite((value) => value.slice(0, MAX_QUERY_LENGTH))), ''),
  status: z.catch(z.optional(z.enum([firstStatus, ...otherStatuses])), undefined),
  region: z.catch(z.optional(z.enum(['APAC', 'EMEA'])), undefined),
  country: z.catch(z.optional(z.enum([firstCountry, ...otherCountries])), undefined),
  sort: z.catch(z.enum(sortKeys), DEFAULT_SORT),
  dir: z.catch(z.enum(['asc', 'desc']), 'asc'),
})

export type RunListParams = z.infer<typeof paramsSchema>

export function parseRunListParams(search: URLSearchParams): RunListParams {
  return paramsSchema.parse({
    q: search.get('q') ?? '',
    status: search.get('status') ?? undefined,
    region: search.get('region') ?? undefined,
    country: search.get('country') ?? undefined,
    sort: search.get('sort') ?? undefined,
    dir: search.get('dir') ?? undefined,
  })
}

/** Canonical form: fixed parameter order and defaults omitted, so equal views always produce equal URLs. */
export function toSearchParams(params: RunListParams): URLSearchParams {
  const search = new URLSearchParams()
  // The text is kept exactly as typed (including spaces) so the search box never rewrites what the user is typing;
  // runList trims it when filtering.
  if (params.q !== '') search.set('q', params.q)
  if (params.status) search.set('status', params.status)
  if (params.region) search.set('region', params.region)
  if (params.country) search.set('country', params.country)
  if (params.sort !== DEFAULT_SORT || params.dir !== 'asc') {
    search.set('sort', params.sort)
    search.set('dir', params.dir)
  }
  return search
}
