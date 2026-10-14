import { describe, expect, it } from 'vitest'
import { parseAuditListParams, toSearchParams } from '@/features/audit/params'

const parse = (query: string) => parseAuditListParams(new URLSearchParams(query))

describe('parseAuditListParams', () => {
  it('has no filters by default', () => {
    expect(parse('')).toEqual({ kind: undefined, run: undefined, actor: undefined })
  })

  it('accepts valid values', () => {
    expect(parse('kind=run.approved&run=run-2026-10-009&actor=Mei%20Tanaka')).toEqual({ kind: 'run.approved', run: 'run-2026-10-009', actor: 'Mei Tanaka' })
  })

  it('drops an unknown kind and an over-long value on their own', () => {
    expect(parse(`kind=run.deleted&run=${'x'.repeat(200)}&actor=Mei%20Tanaka`)).toEqual({ kind: undefined, run: undefined, actor: 'Mei Tanaka' })
  })

  it('treats empty values as not set and never throws on odd input', () => {
    expect(parse('kind=&run=&actor=')).toEqual({ kind: undefined, run: undefined, actor: undefined })
    expect(() => parse('kind[]=x&__proto__=1&actor=%E0%A4%A')).not.toThrow()
  })
})

describe('toSearchParams', () => {
  it('writes a fixed order and round-trips', () => {
    const params = parse('actor=Mei%20Tanaka&run=run-2026-10-009&kind=exception.resolved')

    expect(toSearchParams(params).toString()).toBe('kind=exception.resolved&run=run-2026-10-009&actor=Mei+Tanaka')
    expect(parse(toSearchParams(params).toString())).toEqual(params)
    expect(toSearchParams(parse('')).toString()).toBe('')
  })
})
