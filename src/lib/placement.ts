import type { Country, Organization } from '@/fixtures'

/** Anything that belongs to an organisation in a country: a payroll run or a sample employee. */
type Placed = { organizationId: string; countryCode: string }

export type Placement = {
  organization: string
  country: Country
  /** "Organisation · Country", the label every page uses for a run. */
  label: string
}

/**
 * Builds the one lookup that turns an organisation id and a country code into names and the shared "Organisation · Country"
 * label. A reference to a missing organisation or country is a data bug, so it throws.
 */
export function createPlacement(organizations: readonly Organization[], countries: readonly Country[]) {
  const organizationName = new Map(organizations.map((o) => [o.id, o.name]))
  const countryByCode = new Map(countries.map((c) => [c.code, c]))

  return function placementOf(item: Placed): Placement {
    const organization = organizationName.get(item.organizationId)
    const country = countryByCode.get(item.countryCode)
    if (!organization) throw new Error(`Unknown organization: ${item.organizationId}`)
    if (!country) throw new Error(`Unknown country: ${item.countryCode}`)
    return { organization, country, label: `${organization} · ${country.name}` }
  }
}
