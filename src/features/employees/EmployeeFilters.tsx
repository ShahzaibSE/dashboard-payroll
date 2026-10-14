import type { Ref } from 'react'
import { Button } from '@/components/ui/button'
import type { EmployeeList } from '@/features/employees/employeeList'
import { MAX_QUERY_LENGTH, type EmployeeListParams } from '@/features/employees/params'

type EmployeeFiltersProps = {
  /** The filters that took effect. */
  params: EmployeeListParams
  /** What the search box shows; may be ahead of the URL while the user is typing. */
  searchText: string
  options: EmployeeList['options']
  /** Lets the page put focus back in the search box after an action removes the control that had it. */
  searchRef?: Ref<HTMLInputElement>
  onChange: (patch: Partial<EmployeeListParams>) => void
  onClear: () => void
}

const controlClass = 'h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm'
const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground'

export default function EmployeeFilters({ params, searchText, options, searchRef, onChange, onClear }: EmployeeFiltersProps) {
  return (
    <form role="search" aria-label="Filter employees" className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto]" onSubmit={(event) => event.preventDefault()}>
      <div>
        <label htmlFor="employee-search" className={labelClass}>
          Search
        </label>
        <input
          id="employee-search"
          ref={searchRef}
          type="search"
          className={controlClass}
          placeholder="Name or job title"
          maxLength={MAX_QUERY_LENGTH}
          value={searchText}
          onChange={(event) => onChange({ q: event.target.value })}
        />
      </div>
      <div>
        <label htmlFor="employee-organization" className={labelClass}>
          Organisation
        </label>
        <select id="employee-organization" className={controlClass} value={params.org ?? ''} onChange={(event) => onChange({ org: event.target.value || undefined })}>
          <option value="">All organisations</option>
          {options.organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="employee-country" className={labelClass}>
          Country
        </label>
        <select id="employee-country" className={controlClass} value={params.country ?? ''} onChange={(event) => onChange({ country: event.target.value || undefined })}>
          <option value="">All countries</option>
          {options.countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <Button variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    </form>
  )
}
