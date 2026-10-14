import { useRef } from 'react'
import { useSearchParams } from 'react-router'
import PageHeader from '@/components/PageHeader'
import RunFilters from '@/features/payroll-runs/RunFilters'
import RunsTable from '@/features/payroll-runs/RunsTable'
import { parseRunListParams, toSearchParams, type RunListParams, type SortKey } from '@/features/payroll-runs/params'
import { buildRunList } from '@/features/payroll-runs/runList'
import { Button } from '@/components/ui/button'
import { countries, organizations } from '@/fixtures'
import { useUrlDraft } from '@/lib/useUrlDraft'
import { usePayrollState } from '@/state/payroll/context'

export default function PayrollRunsPage() {
  const [search, setSearch] = useSearchParams()
  const { runs } = usePayrollState()
  // The draft is the latest intended filter state; see useUrlDraft.
  const [params, setParams] = useUrlDraft(parseRunListParams(search), search.toString())
  const searchBox = useRef<HTMLInputElement>(null)
  const list = buildRunList({ runs, organizations, countries }, params)

  // Every change composes onto the draft and is then written to the URL, which holds the shareable state. Edits replace the
  // history entry (so typing does not flood history) and keep the scroll position.
  function commit(next: RunListParams) {
    setParams(next)
    setSearch(toSearchParams(next), { replace: true, preventScrollReset: true })
  }

  function update(patch: Partial<RunListParams>) {
    commit({ ...params, ...patch })
  }

  function sortBy(key: SortKey) {
    update(params.sort === key ? { dir: params.dir === 'asc' ? 'desc' : 'asc' } : { sort: key, dir: 'asc' })
  }

  function clearAll() {
    commit(parseRunListParams(new URLSearchParams()))
  }

  // The empty-state button unmounts when the table returns, so focus has to be placed deliberately.
  function clearFromEmptyState() {
    clearAll()
    searchBox.current?.focus()
  }

  const count = list.rows.length
  return (
    <>
      <PageHeader title="Payroll runs" description="October 2026 pay period · APAC and EMEA" />
      <RunFilters params={params} searchText={params.q} searchRef={searchBox} onChange={update} onClear={clearAll} />
      <p role="status" className="mb-2 text-sm text-muted-foreground tabular">
        Showing {count} of {list.total} runs
      </p>
      {count === 0 ? (
        <div className="rounded-lg border border-dashed border-input bg-card p-6 text-sm">
          <p className="font-medium">No payroll runs match these filters.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={clearFromEmptyState}>
            Clear all filters
          </Button>
        </div>
      ) : (
        <RunsTable rows={list.rows} sort={params.sort} dir={params.dir} onSort={sortBy} />
      )}
    </>
  )
}
