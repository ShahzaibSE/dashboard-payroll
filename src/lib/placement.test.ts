import { describe, expect, it } from 'vitest'
import { countries, organizations } from '@/fixtures'
import { createPlacement } from '@/lib/placement'

describe('createPlacement', () => {
  const placementOf = createPlacement(organizations, countries)
  const org = organizations[0]
  const country = countries[0]

  it('names the organisation and country and builds the shared label', () => {
    const placement = placementOf({ organizationId: org.id, countryCode: country.code })
    expect(placement.organization).toBe(org.name)
    expect(placement.country).toBe(country)
    expect(placement.label).toBe(`${org.name} · ${country.name}`)
  })

  it('throws for a missing organisation or country instead of inventing a label', () => {
    expect(() => placementOf({ organizationId: 'org-missing', countryCode: country.code })).toThrow('Unknown organization: org-missing')
    expect(() => placementOf({ organizationId: org.id, countryCode: 'ZZ' })).toThrow('Unknown country: ZZ')
  })
})
