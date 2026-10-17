import * as z from 'zod/mini'
import { severityOrder } from '@/lib/payroll-status'

export const sortKeys = ['severity', 'status', 'raised', 'run'] as const
export type SortKey = (typeof sortKeys)[number]

export const statusFilters = ['unresolved', 'all', 'open', 'in_progress', 'resolved'] as const
export type StatusFilter = (typeof statusFilters)[number]

export const DEFAULT_STATUS: StatusFilter = 'unresolved'
export const DEFAULT_SORT: SortKey = 'severity'

const [firstSeverity, ...otherSeverities] = severityOrder

/**
 * The URL is untrusted input: each parameter is validated on its own and falls back to its default, so one bad value
 * never discards the others and nothing here can throw.
 */
const paramsSchema = z.object({
  status: z.catch(z.enum(statusFilters), DEFAULT_STATUS),
  severity: z.catch(z.optional(z.enum([firstSeverity, ...otherSeverities])), undefined),
  region: z.catch(z.optional(z.enum(['APAC', 'EMEA'])), undefined),
  sort: z.catch(z.enum(sortKeys), DEFAULT_SORT),
  dir: z.catch(z.enum(['asc', 'desc']), 'asc'),
})

export type ExceptionListParams = z.infer<typeof paramsSchema>

export function parseExceptionListParams(search: URLSearchParams): ExceptionListParams {
  return paramsSchema.parse({
    status: search.get('status') ?? undefined,
    severity: search.get('severity') ?? undefined,
    region: search.get('region') ?? undefined,
    sort: search.get('sort') ?? undefined,
    dir: search.get('dir') ?? undefined,
  })
}

/** Canonical form: fixed order, defaults omitted, so equal views give equal URLs. */
export function toSearchParams(params: ExceptionListParams): URLSearchParams {
  const search = new URLSearchParams()
  if (params.status !== DEFAULT_STATUS) search.set('status', params.status)
  if (params.severity) search.set('severity', params.severity)
  if (params.region) search.set('region', params.region)
  if (params.sort !== DEFAULT_SORT || params.dir !== 'asc') {
    search.set('sort', params.sort)
    search.set('dir', params.dir)
  }
  return search
}
