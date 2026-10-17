import { Link } from 'react-router'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import type { Approvals } from '@/features/approvals/approvals'
import { formatInteger, formatShortDate, formatUsd } from '@/lib/format'

export default function ApprovalQueue({ queue }: { queue: Approvals['queue'] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Awaiting approval</CardTitle>
        <span className="text-xs text-muted-foreground tabular">{queue.length}</span>
      </CardHeader>
      {queue.length === 0 ? (
        <p className="border-t border-border px-4 py-6 text-sm text-muted-foreground">No runs are waiting for approval.</p>
      ) : (
        <div role="region" aria-label="Runs awaiting approval, scrollable" tabIndex={0} className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[46rem] text-sm">
            <caption className="sr-only">Payroll runs awaiting approval, earliest pay date first</caption>
            <thead>
              <tr className="bg-muted/60 text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">Run</th>
                <th scope="col" className="px-4 py-2 font-medium">Pay date</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Employees</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Gross (USD)</th>
                <th scope="col" className="px-4 py-2 font-medium">Blocking</th>
                <th scope="col" className="px-4 py-2 font-medium">Review</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((row) => (
                <tr key={row.id} className="border-t border-border align-top">
                  <th scope="row" className="min-w-52 px-4 py-2 text-left font-normal">
                    <span className="font-medium">{row.runLabel}</span>
                    <span className="block text-xs text-muted-foreground tabular">{row.id}</span>
                  </th>
                  <td className="whitespace-nowrap px-4 py-2 tabular">
                    {formatShortDate(row.payDate)}
                    <span className="block text-xs text-muted-foreground">{row.payDateRelative}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular">{formatInteger(row.employeeCount)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular">{formatUsd(row.grossUsd)}</td>
                  <td className="px-4 py-2">
                    {row.blockers > 0 ? (
                      <span className="text-danger">
                        {row.blockers} critical {row.blockers === 1 ? 'exception' : 'exceptions'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      to={`/payroll-runs/${row.id}`}
                      className="inline-flex h-8 items-center rounded-md border border-input bg-card px-2.5 text-sm font-medium hover:bg-muted"
                    >
                      Review run<span className="sr-only">: {row.runLabel}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
