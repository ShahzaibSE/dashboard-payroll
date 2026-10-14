import type { Ref } from 'react'
import { Button } from '@/components/ui/button'
import { statusFilters, type ExceptionListParams, type StatusFilter } from '@/features/exceptions/params'
import { severityOrder, severityPresentation } from '@/lib/payroll-status'

type ExceptionFiltersProps = {
  params: ExceptionListParams
  /** The first control, so the page can put focus back in the filters after an action removes the one that had it. */
  firstControlRef?: Ref<HTMLSelectElement>
  onChange: (patch: Partial<ExceptionListParams>) => void
  onClear: () => void
}

const controlClass = 'h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm'
const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground'

const statusLabel: Record<StatusFilter, string> = {
  unresolved: 'Unresolved',
  all: 'All statuses',
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
}

export default function ExceptionFilters({ params, firstControlRef, onChange, onClear }: ExceptionFiltersProps) {
  return (
    <form role="search" aria-label="Filter exceptions" className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]" onSubmit={(event) => event.preventDefault()}>
      <div>
        <label htmlFor="exception-status" className={labelClass}>
          Status
        </label>
        <select
          id="exception-status"
          ref={firstControlRef}
          className={controlClass}
          value={params.status}
          onChange={(event) => onChange({ status: event.target.value as StatusFilter })}
        >
          {statusFilters.map((status) => (
            <option key={status} value={status}>
              {statusLabel[status]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="exception-severity" className={labelClass}>
          Severity
        </label>
        <select
          id="exception-severity"
          className={controlClass}
          value={params.severity ?? ''}
          onChange={(event) => onChange({ severity: (event.target.value || undefined) as ExceptionListParams['severity'] })}
        >
          <option value="">All severities</option>
          {severityOrder.map((severity) => (
            <option key={severity} value={severity}>
              {severityPresentation[severity].label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="exception-region" className={labelClass}>
          Region
        </label>
        <select
          id="exception-region"
          className={controlClass}
          value={params.region ?? ''}
          onChange={(event) => onChange({ region: (event.target.value || undefined) as ExceptionListParams['region'] })}
        >
          <option value="">All regions</option>
          <option value="APAC">APAC</option>
          <option value="EMEA">EMEA</option>
        </select>
      </div>
      <div className="flex items-end">
        <Button variant="outline" onClick={onClear}>
          Reset filters
        </Button>
      </div>
    </form>
  )
}
