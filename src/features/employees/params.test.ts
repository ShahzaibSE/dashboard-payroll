import { describe, expect, it } from 'vitest'
import { MAX_QUERY_LENGTH, parseEmployeeListParams, toSearchParams } from '@/features/employees/params'

const parse = (query: string) => parseEmployeeListParams(new URLSearchParams(query))

describe('parseEmployeeListParams', () => {
  it('uses defaults for an empty query string', () => {
    expect(parse('')).toEqual({ q: '', org: undefined, country: undefined, sort: 'name', dir: 'asc', page: 1 })
  })

  it('accepts every valid value', () => {
    expect(parse('q=%20analyst&org=org-lumen&country=SG&sort=title&dir=desc&page=3')).toEqual({
      q: ' analyst',
      org: 'org-lumen',
      country: 'SG',
      sort: 'title',
      dir: 'desc',
      page: 3,
    })
  })

  it.each([['0'], ['-2'], ['abc'], ['2.5'], [''], ['99999999'], ['1e3'], [' 2']])('treats page "%s" as page 1', (page) => {
    expect(parse(`page=${encodeURIComponent(page)}`).page).toBe(1)
  })

  it('drops each invalid value on its own and shortens an over-long search', () => {
    const parsed = parse(`sort=password&dir=up&org=${'x'.repeat(200)}&q=${'a'.repeat(500)}&country=SG`)

    expect(parsed).toMatchObject({ sort: 'name', dir: 'asc', org: undefined, country: 'SG' })
    expect(parsed.q).toHaveLength(MAX_QUERY_LENGTH)
  })

  it('never throws on odd input', () => {
    expect(() => parse('q=%E0%A4%A&sort[]=x&__proto__=1&page[]=2')).not.toThrow()
  })
})

describe('toSearchParams', () => {
  it('omits defaults and page 1', () => {
    expect(toSearchParams(parse('')).toString()).toBe('')
    expect(toSearchParams(parse('sort=name&dir=asc&page=1')).toString()).toBe('')
  })

  it('keeps the search text as typed, in a fixed order, and round-trips', () => {
    const params = parse('page=2&dir=desc&sort=country&country=SG&org=org-lumen&q=%20ab%20')

    expect(toSearchParams(params).toString()).toBe('q=+ab+&org=org-lumen&country=SG&sort=country&dir=desc&page=2')
    expect(parse(toSearchParams(params).toString())).toEqual(params)
  })
})
