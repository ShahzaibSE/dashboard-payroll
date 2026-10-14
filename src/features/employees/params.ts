import * as z from 'zod/mini'

export const sortKeys = ['name', 'title', 'organization', 'country'] as const
export type SortKey = (typeof sortKeys)[number]

export const PAGE_SIZE = 25
export const MAX_QUERY_LENGTH = 80
const MAX_ID_LENGTH = 40
export const DEFAULT_SORT: SortKey = 'name'

/**
 * The URL is untrusted input: each parameter is validated on its own and falls back to its default, so one bad value never
 * discards the others and nothing here can throw. `org` and `country` are plain strings here; they only take effect when
 * they match something that exists, and an out-of-range `page` is brought into range (see `buildEmployeeList`).
 */
const paramsSchema = z.object({
  q: z.catch(z.string().check(z.overwrite((value) => value.slice(0, MAX_QUERY_LENGTH))), ''),
  org: z.catch(z.optional(z.string().check(z.maxLength(MAX_ID_LENGTH))), undefined),
  country: z.catch(z.optional(z.string().check(z.maxLength(MAX_ID_LENGTH))), undefined),
  sort: z.catch(z.enum(sortKeys), DEFAULT_SORT),
  dir: z.catch(z.enum(['asc', 'desc']), 'asc'),
  page: z.catch(z.int().check(z.minimum(1), z.maximum(10_000)), 1),
})

export type EmployeeListParams = z.infer<typeof paramsSchema>

export function parseEmployeeListParams(search: URLSearchParams): EmployeeListParams {
  const rawPage = search.get('page')
  return paramsSchema.parse({
    q: search.get('q') ?? '',
    org: search.get('org') || undefined,
    country: search.get('country') || undefined,
    sort: search.get('sort') ?? undefined,
    dir: search.get('dir') ?? undefined,
    page: rawPage !== null && /^\d{1,5}$/.test(rawPage) ? Number(rawPage) : undefined,
  })
}

/** Canonical form: fixed order and defaults omitted, so equal views always produce equal URLs. */
export function toSearchParams(params: EmployeeListParams): URLSearchParams {
  const search = new URLSearchParams()
  // The search text is kept exactly as typed (spaces included) so the search box is never rewritten; filtering trims it.
  if (params.q !== '') search.set('q', params.q)
  if (params.org) search.set('org', params.org)
  if (params.country) search.set('country', params.country)
  if (params.sort !== DEFAULT_SORT || params.dir !== 'asc') {
    search.set('sort', params.sort)
    search.set('dir', params.dir)
  }
  if (params.page > 1) search.set('page', String(params.page))
  return search
}
