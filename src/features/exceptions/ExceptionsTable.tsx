import { Link } from 'react-router'
import ExceptionActions from '@/components/ExceptionActions'
import ExceptionStatusBadge from '@/components/ExceptionStatusBadge'
import SeverityBadge from '@/components/SeverityBadge'
import SortableHeader from '@/components/SortableHeader'
import type { ExceptionRow } from '@/features/exceptions/exceptionList'
import type { ExceptionListParams, SortKey } from '@/features/exceptions/params'
import { formatShortDate } from '@/lib/format'

type ExceptionsTableProps = {
  rows: ExceptionRow[]
  sort: ExceptionListParams['sort']
  dir: ExceptionListParams['dir']
  onSort: (key: SortKey) => void
  onTake: (exceptionId: string) => void
  onResolve: (exceptionId: string) => void
}

export default function ExceptionsTable({ rows, sort, dir, onSort, onTake, onResolve }: ExceptionsTableProps) {
  return (
    <div role="region" aria-label="Exceptions, scrollable" tabIndex={0} className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[60rem] text-sm">
        <caption className="sr-only">Payroll exceptions across all runs</caption>
        <thead>
          <tr className="bg-muted/60 text-left text-xs text-muted-foreground">
            <SortableHeader label="Severity" sortKey="severity" activeKey={sort} dir={dir} onSort={onSort} />
            <th scope="col" className="px-4 py-2 font-medium">Exception</th>
            <SortableHeader label="Run" sortKey="run" activeKey={sort} dir={dir} onSort={onSort} />
            <SortableHeader label="Status" sortKey="status" activeKey={sort} dir={dir} onSort={onSort} />
            <th scope="col" className="px-4 py-2 font-medium">Owner</th>
            <SortableHeader label="Raised" sortKey="raised" activeKey={sort} dir={dir} onSort={onSort} />
            <th scope="col" className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border align-top">
              <td className="px-4 py-2">
                <SeverityBadge severity={row.severity} />
              </td>
              <th scope="row" className="min-w-56 px-4 py-2 text-left font-normal">
                {row.title}
              </th>
              <td className="min-w-44 px-4 py-2">
                <Link to={`/payroll-runs/${row.runId}`} className="font-medium text-primary underline-offset-2 hover:underline">
                  {row.runLabel}
                </Link>
                <span className="block text-xs text-muted-foreground">{row.region}</span>
              </td>
              <td className="px-4 py-2">
                <ExceptionStatusBadge status={row.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-2">{row.assignee ?? <span className="text-muted-foreground">Unassigned</span>}</td>
              <td className="whitespace-nowrap px-4 py-2 tabular">{formatShortDate(row.raisedOn)}</td>
              <td className="px-4 py-2">
                <ExceptionActions
                  title={row.title}
                  canTake={row.canTake}
                  canResolve={row.canResolve}
                  onTake={() => onTake(row.id)}
                  onResolve={() => onResolve(row.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
