import { Link } from 'react-router'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import type { Overview } from '@/features/overview/summary'

export default function RecentActivity({ rows, className }: { rows: Overview['activity']; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle>Recent activity</CardTitle>
        <Link to="/audit" className="text-xs font-medium text-primary underline-offset-2 hover:underline">
          View audit activity
        </Link>
      </CardHeader>
      <ol className="border-t border-border">
        {rows.map((row) => (
          <li key={row.id} className="border-t border-border px-4 py-2.5 first:border-t-0">
            <p className="text-sm">
              <span className="font-medium">{row.actor}</span> {row.action}{' '}
              <Link to={`/payroll-runs/${row.runId}`} className="font-medium text-primary underline-offset-2 hover:underline">
                {row.runLabel}
              </Link>
            </p>
            <time dateTime={`${row.occurredAt}Z`} className="text-xs text-muted-foreground tabular">
              {row.when}
            </time>
          </li>
        ))}
      </ol>
    </Card>
  )
}
