import { useRef } from 'react'
import { useSearchParams } from 'react-router'
import OutcomeMessage from '@/components/OutcomeMessage'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import ExceptionFilters from '@/features/exceptions/ExceptionFilters'
import ExceptionsTable from '@/features/exceptions/ExceptionsTable'
import { buildExceptionList } from '@/features/exceptions/exceptionList'
import { parseExceptionListParams, toSearchParams, type ExceptionListParams, type SortKey } from '@/features/exceptions/params'
import { countries, organizations } from '@/fixtures'
import { useUrlDraft } from '@/lib/useUrlDraft'
import { usePayrollState } from '@/state/payroll/context'
import { useWorkflowAction } from '@/state/payroll/useWorkflowAction'

export default function ExceptionsPage() {
  const [search, setSearch] = useSearchParams()
  const state = usePayrollState()
  const { message, bannerRef, perform } = useWorkflowAction()
  const firstFilter = useRef<HTMLSelectElement>(null)
  // The draft is the latest intended filter state; see useUrlDraft.
  const [params, setParams] = useUrlDraft(parseExceptionListParams(search), search.toString())
  const list = buildExceptionList({ state, organizations, countries }, params)

  // Every change composes onto the draft and is then written to the URL. Edits replace the history entry and keep the scroll position.
  function commit(next: ExceptionListParams) {
    setParams(next)
    setSearch(toSearchParams(next), { replace: true, preventScrollReset: true })
  }

  function update(patch: Partial<ExceptionListParams>) {
    commit({ ...params, ...patch })
  }

  function sortBy(key: SortKey) {
    update(params.sort === key ? { dir: params.dir === 'asc' ? 'desc' : 'asc' } : { sort: key, dir: 'asc' })
  }

  function reset() {
    commit(parseExceptionListParams(new URLSearchParams()))
  }

  // The empty-state button unmounts when the table returns, so focus has to be placed deliberately.
  function resetFromEmptyState() {
    reset()
    firstFilter.current?.focus()
  }

  const count = list.rows.length
  return (
    <>
      <PageHeader title="Exceptions" description={`${list.unresolved} unresolved of ${list.total} exceptions · APAC and EMEA`} />
      <OutcomeMessage ref={bannerRef} message={message} />
      <ExceptionFilters params={params} firstControlRef={firstFilter} onChange={update} onClear={reset} />
      <p aria-live="polite" className="mb-2 text-sm text-muted-foreground tabular">
        Showing {count} of {list.total} exceptions
      </p>
      {count === 0 ? (
        <div className="rounded-lg border border-dashed border-input bg-card p-6 text-sm">
          <p className="font-medium">No exceptions match these filters.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={resetFromEmptyState}>
            Reset filters
          </Button>
        </div>
      ) : (
        <ExceptionsTable
          rows={list.rows}
          sort={params.sort}
          dir={params.dir}
          onSort={sortBy}
          onTake={(exceptionId) => perform({ type: 'exception/take', exceptionId }, 'You now own this exception (simulated).')}
          onResolve={(exceptionId) => perform({ type: 'exception/resolve', exceptionId }, 'Exception resolved (simulated).')}
        />
      )}
    </>
  )
}
