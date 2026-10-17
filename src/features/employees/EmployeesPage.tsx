import { useRef } from 'react'
import { useSearchParams } from 'react-router'
import PageHeader from '@/components/PageHeader'
import ResultCount from '@/components/ResultCount'
import { Button } from '@/components/ui/button'
import EmployeeFilters from '@/features/employees/EmployeeFilters'
import EmployeesTable from '@/features/employees/EmployeesTable'
import Pagination from '@/features/employees/Pagination'
import { buildEmployeeList } from '@/features/employees/employeeList'
import { parseEmployeeListParams, toSearchParams, type EmployeeListParams, type SortKey } from '@/features/employees/params'
import { countries, employees, organizations } from '@/fixtures'
import { OWN_URL_WRITE, useUrlDraft } from '@/lib/useUrlDraft'

const sampleNote = 'A fictional sample, not the full workforce. People are listed by organisation and country only; this directory does not say which run anyone is paid in.'

export default function EmployeesPage() {
  const [search, setSearch] = useSearchParams()
  // The draft is the latest intended filter state; see useUrlDraft.
  const [draft, setDraft] = useUrlDraft(parseEmployeeListParams(search))
  const searchBox = useRef<HTMLInputElement>(null)
  const list = buildEmployeeList({ employees, organizations, countries }, draft)

  // Every change composes onto the draft (as the filters that took effect) and is then written to the URL. Edits replace the
  // history entry (so typing does not flood history) and keep the scroll position.
  function commit(next: EmployeeListParams) {
    setDraft(next)
    setSearch(toSearchParams(next), OWN_URL_WRITE)
  }

  // Any change other than the page itself starts again from page 1.
  function update(patch: Partial<EmployeeListParams>) {
    commit({ ...list.effective, ...patch, page: patch.page ?? 1 })
  }

  function sortBy(key: SortKey) {
    update(list.effective.sort === key ? { dir: list.effective.dir === 'asc' ? 'desc' : 'asc' } : { sort: key, dir: 'asc' })
  }

  function clear() {
    commit(parseEmployeeListParams(new URLSearchParams()))
  }

  // The empty-state button unmounts when the table returns, so focus has to be placed deliberately.
  function clearFromEmptyState() {
    clear()
    searchBox.current?.focus()
  }

  const filtered = list.matched !== list.total
  return (
    <>
      <PageHeader title="Employees" description={`Sample directory · ${list.total} fictional employees`} />
      <p className="mb-4 max-w-prose text-sm text-muted-foreground">{sampleNote}</p>
      <EmployeeFilters params={list.effective} searchText={list.effective.q} options={list.options} searchRef={searchBox} onChange={update} onClear={clear} />
      <ResultCount
        text={
          list.matched === 0
            ? `Showing 0 of ${list.total} employees`
            : `Showing ${list.from}–${list.to} of ${list.matched}${filtered ? ` matching employees (${list.total} in the sample)` : ' employees'}`
        }
        announcement={`${list.matched} of ${list.total} employees match, page ${list.page} of ${list.pageCount}`}
      />
      {list.matched === 0 ? (
        <div className="rounded-lg border border-dashed border-input bg-card p-6 text-sm">
          <p className="font-medium">No employees match these filters.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={clearFromEmptyState}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <EmployeesTable rows={list.rows} sort={list.effective.sort} dir={list.effective.dir} onSort={sortBy} />
          <Pagination page={list.page} pageCount={list.pageCount} onPage={(page) => update({ page })} />
        </>
      )}
    </>
  )
}
