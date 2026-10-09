import { Link } from 'react-router'
import RunStatusBadge from '@/components/RunStatusBadge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import type { Overview } from '@/features/overview/summary'
import { formatInteger, formatShortDate, formatUsd } from '@/lib/format'

export default function RecentRuns({ rows, className }: { rows: Overview['recentRuns']; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle>Recent payroll runs</CardTitle>
        <Link to="/payroll-runs" className="text-xs font-medium text-primary underline-offset-2 hover:underline">
          View all runs
        </Link>
      </CardHeader>
      <div role="region" aria-label="Recent payroll runs, scrollable" tabIndex={0} className="overflow-x-auto border-t border-border">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="sr-only">Payroll runs updated most recently</caption>
          <thead>
            <tr className="bg-muted/60 text-left text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-2 font-medium">Run</th>
              <th scope="col" className="px-4 py-2 font-medium">Pay date</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Employees</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Gross (USD)</th>
              <th scope="col" className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <th scope="row" className="min-w-44 px-4 py-2 text-left font-normal">
                  <Link to={`/payroll-runs/${row.id}`} className="font-medium text-primary underline-offset-2 hover:underline">
                    {row.organization}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{row.country}</span>
                </th>
                <td className="whitespace-nowrap px-4 py-2 tabular">{formatShortDate(row.payDate)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular">{formatInteger(row.employeeCount)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular">{formatUsd(row.grossUsd)}</td>
                <td className="px-4 py-2">
                  <RunStatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
