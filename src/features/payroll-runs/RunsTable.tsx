import { Link } from 'react-router'
import RunStatusBadge from '@/components/RunStatusBadge'
import SortableHeader from '@/components/SortableHeader'
import type { RunListParams, SortKey } from '@/features/payroll-runs/params'
import type { RunListRow } from '@/features/payroll-runs/runList'
import { formatInteger, formatShortDate, formatUsd } from '@/lib/format'

type RunsTableProps = { rows: RunListRow[]; sort: RunListParams['sort']; dir: RunListParams['dir']; onSort: (key: SortKey) => void }

type Column = { key: SortKey; label: string; align?: 'right' }

const columns: Column[] = [
  { key: 'organization', label: 'Organisation' },
  { key: 'country', label: 'Country' },
  { key: 'payDate', label: 'Pay date' },
  { key: 'employees', label: 'Employees', align: 'right' },
  { key: 'gross', label: 'Gross (USD)', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'updated', label: 'Updated' },
]

export default function RunsTable({ rows, sort, dir, onSort }: RunsTableProps) {
  return (
    <div role="region" aria-label="Payroll runs, scrollable" tabIndex={0} className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[52rem] text-sm">
        <caption className="sr-only">Payroll runs for October 2026</caption>
        <thead>
          <tr className="bg-muted/60 text-left text-xs text-muted-foreground">
            {columns.map(({ key, label, align }) => (
              <SortableHeader key={key} label={label} sortKey={key} activeKey={sort} dir={dir} onSort={onSort} align={align} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <th scope="row" className="min-w-44 px-4 py-2 text-left font-normal">
                <Link to={`/payroll-runs/${row.id}`} className="font-medium text-primary underline-offset-2 hover:underline">
                  {row.organization}
                </Link>
                <span className="block text-xs text-muted-foreground tabular">{row.id}</span>
              </th>
              <td className="whitespace-nowrap px-4 py-2">
                {row.country}
                <span className="block text-xs text-muted-foreground">{row.region}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-2 tabular">{formatShortDate(row.payDate)}</td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular">{formatInteger(row.employeeCount)}</td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular">{formatUsd(row.grossUsd)}</td>
              <td className="px-4 py-2">
                <RunStatusBadge status={row.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-2 tabular">{formatShortDate(row.updatedOn)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
