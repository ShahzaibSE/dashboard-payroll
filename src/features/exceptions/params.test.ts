import { describe, expect, it } from 'vitest'
import { parseExceptionListParams, toSearchParams } from '@/features/exceptions/params'

const parse = (query: string) => parseExceptionListParams(new URLSearchParams(query))

describe('parseExceptionListParams', () => {
  it('shows unresolved exceptions, most severe first, by default', () => {
    expect(parse('')).toEqual({ status: 'unresolved', severity: undefined, region: undefined, sort: 'severity', dir: 'asc' })
  })

  it('accepts every valid value', () => {
    expect(parse('status=in_progress&severity=high&region=APAC&sort=raised&dir=desc')).toEqual({
      status: 'in_progress',
      severity: 'high',
      region: 'APAC',
      sort: 'raised',
      dir: 'desc',
    })
    expect(parse('status=all').status).toBe('all')
  })

  it('drops each invalid value on its own', () => {
    expect(parse('status=hacked&severity=urgent&region=EMEA&sort=password&dir=up')).toEqual({
      status: 'unresolved',
      severity: undefined,
      region: 'EMEA',
      sort: 'severity',
      dir: 'asc',
    })
  })

  it('never throws on odd input', () => {
    expect(() => parse('status[]=x&__proto__=1&severity=%E0%A4%A')).not.toThrow()
  })
})

describe('toSearchParams', () => {
  it('omits defaults', () => {
    expect(toSearchParams(parse('')).toString()).toBe('')
    expect(toSearchParams(parse('status=unresolved&sort=severity&dir=asc')).toString()).toBe('')
  })

  it('writes a fixed order and round-trips', () => {
    const params = parse('dir=desc&sort=run&region=EMEA&severity=critical&status=all')

    expect(toSearchParams(params).toString()).toBe('status=all&severity=critical&region=EMEA&sort=run&dir=desc')
    expect(parse(toSearchParams(params).toString())).toEqual(params)
  })
})
