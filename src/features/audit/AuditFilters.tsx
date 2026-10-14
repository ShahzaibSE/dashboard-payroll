import type { Ref } from 'react'
import { Button } from '@/components/ui/button'
import type { AuditList } from '@/features/audit/auditList'
import type { AuditListParams } from '@/features/audit/params'
import { auditKindLabel, auditKindOrder } from '@/lib/audit'

type AuditFiltersProps = {
  /** The filters that took effect. */
  params: AuditListParams
  options: AuditList['options']
  /** The first control, so the page can put focus back in the filters after an action removes the one that had it. */
  firstControlRef?: Ref<HTMLSelectElement>
  onChange: (patch: Partial<AuditListParams>) => void
  onClear: () => void
}

const controlClass = 'h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm'
const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground'

export default function AuditFilters({ params, options, firstControlRef, onChange, onClear }: AuditFiltersProps) {
  return (
    <form role="search" aria-label="Filter audit activity" className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]" onSubmit={(event) => event.preventDefault()}>
      <div>
        <label htmlFor="audit-kind" className={labelClass}>
          Event type
        </label>
        <select
          id="audit-kind"
          ref={firstControlRef}
          className={controlClass}
          value={params.kind ?? ''}
          onChange={(event) => onChange({ kind: (event.target.value || undefined) as AuditListParams['kind'] })}
        >
          <option value="">All event types</option>
          {auditKindOrder.map((kind) => (
            <option key={kind} value={kind}>
              {auditKindLabel[kind]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="audit-run" className={labelClass}>
          Run
        </label>
        <select id="audit-run" className={controlClass} value={params.run ?? ''} onChange={(event) => onChange({ run: event.target.value || undefined })}>
          <option value="">All runs</option>
          {options.runs.map((run) => (
            <option key={run.id} value={run.id}>
              {run.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="audit-actor" className={labelClass}>
          Actor
        </label>
        <select id="audit-actor" className={controlClass} value={params.actor ?? ''} onChange={(event) => onChange({ actor: event.target.value || undefined })}>
          <option value="">All actors</option>
          {options.actors.map((actor) => (
            <option key={actor} value={actor}>
              {actor}
            </option>
          ))}
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
