import SortableHeader from '@/components/SortableHeader'
import type { EmployeeRow } from '@/features/employees/employeeList'
import type { EmployeeListParams, SortKey } from '@/features/employees/params'

type EmployeesTableProps = { rows: EmployeeRow[]; sort: EmployeeListParams['sort']; dir: EmployeeListParams['dir']; onSort: (key: SortKey) => void }

export default function EmployeesTable({ rows, sort, dir, onSort }: EmployeesTableProps) {
  return (
    <div role="region" aria-label="Employees, scrollable" tabIndex={0} className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">Sample directory of fictional employees</caption>
        <thead>
          <tr className="bg-muted/60 text-left text-xs text-muted-foreground">
            <SortableHeader label="Name" sortKey="name" activeKey={sort} dir={dir} onSort={onSort} />
            <SortableHeader label="Job title" sortKey="title" activeKey={sort} dir={dir} onSort={onSort} />
            <SortableHeader label="Organisation" sortKey="organization" activeKey={sort} dir={dir} onSort={onSort} />
            <SortableHeader label="Country" sortKey="country" activeKey={sort} dir={dir} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <th scope="row" className="min-w-44 px-4 py-2 text-left font-normal">
                <span className="font-medium">{row.displayName}</span>
                <span className="block text-xs text-muted-foreground tabular">{row.id}</span>
              </th>
              <td className="px-4 py-2">{row.jobTitle}</td>
              <td className="px-4 py-2">{row.organization}</td>
              <td className="whitespace-nowrap px-4 py-2">{row.country}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
