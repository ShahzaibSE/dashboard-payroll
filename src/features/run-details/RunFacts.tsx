import RunStatusBadge from '@/components/RunStatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RunDetail } from '@/features/run-details/runDetail'
import { formatDate, formatInteger, formatUsd } from '@/lib/format'

export default function RunFacts({ run }: { run: RunDetail }) {
  const facts: { label: string; value: React.ReactNode; note?: string }[] = [
    { label: 'Status', value: <RunStatusBadge status={run.status} /> },
    { label: 'Pay date', value: formatDate(run.payDate), note: run.payDateRelative },
    { label: 'Employees', value: formatInteger(run.employeeCount) },
    { label: 'Gross cost (USD)', value: formatUsd(run.grossUsd), note: 'Converted at a fixed synthetic rate' },
    { label: 'Average per employee (USD)', value: formatUsd(run.averageUsd) },
    { label: 'Country', value: `${run.country} · ${run.region}`, note: `Local currency ${run.currency}` },
    { label: 'Last updated', value: formatDate(run.updatedOn) },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Run summary</CardTitle>
        <span className="text-xs text-muted-foreground tabular">{run.periodLabel}</span>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(({ label, value, note }) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium tabular">{value}</dd>
              {note ? <dd className="text-xs text-muted-foreground">{note}</dd> : null}
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
