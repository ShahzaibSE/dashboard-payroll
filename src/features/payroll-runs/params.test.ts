import { describe, expect, it } from 'vitest'
import { MAX_QUERY_LENGTH, parseRunListParams, toSearchParams } from '@/features/payroll-runs/params'

const parse = (query: string) => parseRunListParams(new URLSearchParams(query))

describe('parseRunListParams', () => {
  it('uses defaults for an empty query string', () => {
    expect(parse('')).toEqual({ q: '', status: undefined, region: undefined, country: undefined, sort: 'payDate', dir: 'asc' })
  })

  it('accepts every valid value', () => {
    expect(parse('q=lumen&status=on_hold&region=EMEA&country=DE&sort=gross&dir=desc')).toEqual({
      q: 'lumen',
      status: 'on_hold',
      region: 'EMEA',
      country: 'DE',
      sort: 'gross',
      dir: 'desc',
    })
  })

  it('drops each invalid value on its own without discarding the valid ones', () => {
    const parsed = parse('status=hacked&region=EMEA&country=XX&sort=password&dir=sideways')

    expect(parsed).toEqual({ q: '', status: undefined, region: 'EMEA', country: undefined, sort: 'payDate', dir: 'asc' })
  })

  it('treats repeated parameters as the first value and never throws on odd input', () => {
    expect(parse('status=paid&status=draft').status).toBe('paid')
    expect(() => parse('q=%E0%A4%A&sort[]=x&__proto__=1')).not.toThrow()
  })

  it('limits the search text length', () => {
    expect(parse(`q=${'a'.repeat(500)}`).q).toHaveLength(MAX_QUERY_LENGTH)
  })
})

describe('toSearchParams', () => {
  it('omits defaults, so the default view has a clean URL', () => {
    expect(toSearchParams(parse('')).toString()).toBe('')
    expect(toSearchParams(parse('sort=payDate&dir=asc&q=')).toString()).toBe('')
  })

  it('keeps the search text exactly as typed, including spaces, so the search box is never rewritten', () => {
    expect(parse('q=%20%20').q).toBe('  ')
    expect(toSearchParams(parse('q=%20ab%20')).get('q')).toBe(' ab ')
    expect(toSearchParams(parse('q=%20')).get('q')).toBe(' ')
  })

  it('writes parameters in a fixed order regardless of how they arrived', () => {
    const a = toSearchParams(parse('dir=desc&sort=gross&country=DE&region=EMEA&status=paid&q=x')).toString()
    const b = toSearchParams(parse('q=x&status=paid&region=EMEA&country=DE&sort=gross&dir=desc')).toString()

    expect(a).toBe(b)
    expect(a).toBe('q=x&status=paid&region=EMEA&country=DE&sort=gross&dir=desc')
  })

  it('round-trips a parsed value', () => {
    const params = parse('q=Quillon&status=in_review&sort=employees&dir=desc')

    expect(parse(toSearchParams(params).toString())).toEqual(params)
  })
})
