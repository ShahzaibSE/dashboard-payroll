import { useRef } from 'react'
import { useSearchParams } from 'react-router'
import PageHeader from '@/components/PageHeader'
import ResultCount from '@/components/ResultCount'
import { Button } from '@/components/ui/button'
import AuditFilters from '@/features/audit/AuditFilters'
import AuditTable from '@/features/audit/AuditTable'
import { buildAuditList } from '@/features/audit/auditList'
import { parseAuditListParams, toSearchParams, type AuditListParams } from '@/features/audit/params'
import { countries, organizations, REFERENCE_DATE } from '@/fixtures'
import { OWN_URL_WRITE, useUrlDraft } from '@/lib/useUrlDraft'
import { usePayrollState } from '@/state/payroll/context'

export default function AuditPage() {
  const [search, setSearch] = useSearchParams()
  const state = usePayrollState()
  const firstFilter = useRef<HTMLSelectElement>(null)
  // The draft is the latest intended filter state; see useUrlDraft.
  const [draft, setDraft] = useUrlDraft(parseAuditListParams(search))
  const list = buildAuditList({ today: REFERENCE_DATE, state, organizations, countries }, draft)

  // Every change composes onto the draft (as the filters that took effect) and is then written to the URL. Edits replace the
  // history entry and keep the scroll position.
  function commit(next: AuditListParams) {
    setDraft(next)
    setSearch(toSearchParams(next), OWN_URL_WRITE)
  }

  function update(patch: Partial<AuditListParams>) {
    commit({ ...list.effective, ...patch })
  }

  function reset() {
    commit(parseAuditListParams(new URLSearchParams()))
  }

  // The empty-state button unmounts when the table returns, so focus has to be placed deliberately.
  function resetFromEmptyState() {
    reset()
    firstFilter.current?.focus()
  }

  const count = list.rows.length
  return (
    <>
      <PageHeader title="Audit activity" description="Every simulated action, newest first. Nothing here is saved and none of it is a real record." />
      <AuditFilters params={list.effective} options={list.options} firstControlRef={firstFilter} onChange={update} onClear={reset} />
      <ResultCount text={`Showing ${count} of ${list.total} events`} announcement={`${count} of ${list.total} events shown`} />
      {count === 0 ? (
        <div className="rounded-lg border border-dashed border-input bg-card p-6 text-sm">
          <p className="font-medium">No audit events match these filters.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={resetFromEmptyState}>
            Reset filters
          </Button>
        </div>
      ) : (
        <AuditTable rows={list.rows} />
      )}
    </>
  )
}
