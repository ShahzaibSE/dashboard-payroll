import { Link } from 'react-router'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import type { Approvals } from '@/features/approvals/approvals'

export default function RecentDecisions({ decisions }: { decisions: Approvals['decisions'] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Recent decisions</CardTitle>
        <span className="text-xs text-muted-foreground tabular">{decisions.length}</span>
      </CardHeader>
      {decisions.length === 0 ? (
        <p className="border-t border-border px-4 py-6 text-sm text-muted-foreground">No approval decisions have been recorded.</p>
      ) : (
        <ol className="border-t border-border">
          {decisions.map((decision) => (
            <li key={decision.id} className="border-t border-border px-4 py-2.5 first:border-t-0">
              <p className="text-sm">
                <span className="font-medium">{decision.outcome}</span> by {decision.actor}:{' '}
                <Link to={`/payroll-runs/${decision.runId}`} className="font-medium text-primary underline-offset-2 hover:underline">
                  {decision.runLabel}
                </Link>
              </p>
              {decision.reason ? <p className="mt-0.5 break-words text-sm text-muted-foreground">Reason: {decision.reason}</p> : null}
              <time dateTime={`${decision.occurredAt}Z`} className="text-xs text-muted-foreground tabular">
                {decision.when}
              </time>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
