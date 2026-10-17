import { Link } from 'react-router'
import type { AuditRow } from '@/features/audit/auditList'

export default function AuditTable({ rows }: { rows: AuditRow[] }) {
  return (
    <div role="region" aria-label="Audit activity, scrollable" tabIndex={0} className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[48rem] text-sm">
        <caption className="sr-only">Audit trail, newest first</caption>
        <thead>
          <tr className="bg-muted/60 text-left text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2 font-medium">When</th>
            <th scope="col" className="px-4 py-2 font-medium">Event</th>
            <th scope="col" className="px-4 py-2 font-medium">Actor</th>
            <th scope="col" className="px-4 py-2 font-medium">Run</th>
            <th scope="col" className="px-4 py-2 font-medium">Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border align-top">
              <td className="whitespace-nowrap px-4 py-2 tabular">
                <time dateTime={`${row.occurredAt}Z`}>{row.when}</time>
              </td>
              <th scope="row" className="min-w-40 px-4 py-2 text-left font-medium">
                {row.kindLabel}
              </th>
              <td className="whitespace-nowrap px-4 py-2">{row.actor}</td>
              <td className="min-w-44 px-4 py-2">
                <Link to={`/payroll-runs/${row.runId}`} className="font-medium text-primary underline-offset-2 hover:underline">
                  {row.runLabel}
                </Link>
              </td>
              <td className="min-w-48 break-words px-4 py-2">
                {row.detail}
                {row.reason ? <span className="block text-muted-foreground">Reason: {row.reason}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
