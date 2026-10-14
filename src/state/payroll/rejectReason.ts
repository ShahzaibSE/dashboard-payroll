import * as z from 'zod/mini'

export const REJECT_REASON_MIN = 10
export const REJECT_REASON_MAX = 300

const rejectReasonSchema = z
  .string()
  .check(
    z.trim(),
    z.minLength(REJECT_REASON_MIN, `Enter at least ${REJECT_REASON_MIN} characters so the reviewer knows what to fix.`),
    z.maxLength(REJECT_REASON_MAX, `Keep the reason to ${REJECT_REASON_MAX} characters or fewer.`),
  )

export type RejectReasonResult = { ok: true; value: string } | { ok: false; message: string }

/** Free text from the user: trimmed, then length-checked. The value is only ever rendered as text. */
export function parseRejectReason(input: string): RejectReasonResult {
  const result = rejectReasonSchema.safeParse(input)
  return result.success ? { ok: true, value: result.data } : { ok: false, message: result.error.issues[0]?.message ?? 'Enter a reason.' }
}
