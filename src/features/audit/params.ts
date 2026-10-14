import * as z from 'zod/mini'
import { auditKindOrder } from '@/lib/audit'

const MAX_ID_LENGTH = 80
const [firstKind, ...otherKinds] = auditKindOrder

/**
 * The URL is untrusted input: each parameter is validated on its own and falls back to "not set", so one bad value never
 * discards the others and nothing here can throw. `run` and `actor` are plain strings here; they only take effect when
 * they match something that exists (see `buildAuditList`).
 */
const paramsSchema = z.object({
  kind: z.catch(z.optional(z.enum([firstKind, ...otherKinds])), undefined),
  run: z.catch(z.optional(z.string().check(z.maxLength(MAX_ID_LENGTH))), undefined),
  actor: z.catch(z.optional(z.string().check(z.maxLength(MAX_ID_LENGTH))), undefined),
})

export type AuditListParams = z.infer<typeof paramsSchema>

export function parseAuditListParams(search: URLSearchParams): AuditListParams {
  return paramsSchema.parse({
    kind: search.get('kind') ?? undefined,
    run: search.get('run') || undefined,
    actor: search.get('actor') || undefined,
  })
}

/** Canonical form: fixed order, nothing for "not set". */
export function toSearchParams(params: AuditListParams): URLSearchParams {
  const search = new URLSearchParams()
  if (params.kind) search.set('kind', params.kind)
  if (params.run) search.set('run', params.run)
  if (params.actor) search.set('actor', params.actor)
  return search
}
