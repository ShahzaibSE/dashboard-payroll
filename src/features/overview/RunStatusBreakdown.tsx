import RunStatusBadge from '@/components/RunStatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Overview } from '@/features/overview/summary'
import { formatInteger } from '@/lib/format'

type RunStatusBreakdownProps = { counts: Overview['statusCounts']; periodLabel: string; className?: string }

export default function RunStatusBreakdown({ counts, periodLabel, className }: RunStatusBreakdownProps) {
  const total = counts.reduce((sum, c) => sum + c.count, 0)
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Runs by status</CardTitle>
        <span className="text-xs text-muted-foreground tabular">
          {total} runs · {periodLabel}
        </span>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {counts.map(({ status, count }) => (
            <li key={status} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3">
              <span>
                <RunStatusBadge status={status} />
              </span>
              <span aria-hidden="true" className="h-2 rounded-full bg-muted">
                <span className="block h-2 rounded-full bg-primary" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
              </span>
              <span className="text-right text-sm font-medium tabular">{formatInteger(count)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
