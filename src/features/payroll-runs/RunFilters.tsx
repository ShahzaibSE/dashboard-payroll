import type { Ref } from 'react'
import { Button } from '@/components/ui/button'
import { countries } from '@/fixtures'
import { MAX_QUERY_LENGTH, type RunListParams } from '@/features/payroll-runs/params'
import { runStatusOrder, runStatusPresentation } from '@/lib/payroll-status'

type RunFiltersProps = {
  params: RunListParams
  /** What the search box shows; may be ahead of the URL while the user is typing. */
  searchText: string
  /** Lets the page move focus into the search box after an action removes the control that had it. */
  searchRef?: Ref<HTMLInputElement>
  onChange: (patch: Partial<RunListParams>) => void
  onClear: () => void
}

const controlClass = 'h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm'
const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground'

export default function RunFilters({ params, searchText, searchRef, onChange, onClear }: RunFiltersProps) {
  return (
    <form role="search" aria-label="Filter payroll runs" className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]" onSubmit={(event) => event.preventDefault()}>
      <div>
        <label htmlFor="run-search" className={labelClass}>
          Search
        </label>
        <input
          id="run-search"
          ref={searchRef}
          type="search"
          className={controlClass}
          placeholder="Organisation, country or run ID"
          maxLength={MAX_QUERY_LENGTH}
          value={searchText}
          onChange={(event) => onChange({ q: event.target.value })}
        />
      </div>
      <div>
        <label htmlFor="run-status" className={labelClass}>
          Status
        </label>
        <select
          id="run-status"
          className={controlClass}
          value={params.status ?? ''}
          onChange={(event) => onChange({ status: (event.target.value || undefined) as RunListParams['status'] })}
        >
          <option value="">All statuses</option>
          {runStatusOrder.map((status) => (
            <option key={status} value={status}>
              {runStatusPresentation[status].label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="run-region" className={labelClass}>
          Region
        </label>
        <select
          id="run-region"
          className={controlClass}
          value={params.region ?? ''}
          onChange={(event) => onChange({ region: (event.target.value || undefined) as RunListParams['region'] })}
        >
          <option value="">All regions</option>
          <option value="APAC">APAC</option>
          <option value="EMEA">EMEA</option>
        </select>
      </div>
      <div>
        <label htmlFor="run-country" className={labelClass}>
          Country
        </label>
        <select
          id="run-country"
          className={controlClass}
          value={params.country ?? ''}
          onChange={(event) => onChange({ country: (event.target.value || undefined) as RunListParams['country'] })}
        >
          <option value="">All countries</option>
          {[...countries]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((country) => (
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
