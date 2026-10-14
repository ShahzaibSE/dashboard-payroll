import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import type { RunDetail } from '@/features/run-details/runDetail'

export default function RunTimeline({ timeline }: { timeline: RunDetail['timeline'] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Run activity</CardTitle>
        <span className="text-xs text-muted-foreground tabular">{timeline.length}</span>
      </CardHeader>
      {timeline.length === 0 ? (
        <p className="border-t border-border px-4 py-6 text-sm text-muted-foreground">No activity recorded for this run.</p>
      ) : (
        <ol className="border-t border-border">
          {timeline.map((row) => (
            <li key={row.id} className="border-t border-border px-4 py-2.5 first:border-t-0">
              <p className="text-sm">
                <span className="font-medium">{row.actor}</span> {row.text}
              </p>
              {row.reason ? <p className="mt-0.5 break-words text-sm text-muted-foreground">Reason: {row.reason}</p> : null}
              <time dateTime={`${row.occurredAt}Z`} className="text-xs text-muted-foreground tabular">
                {row.when}
              </time>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
