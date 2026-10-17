import ExceptionStatusBadge from '@/components/ExceptionStatusBadge'
import SeverityBadge from '@/components/SeverityBadge'
import ExceptionActions from '@/components/ExceptionActions'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import type { RunDetail } from '@/features/run-details/runDetail'
import { formatShortDate } from '@/lib/format'

type RunExceptionsProps = { exceptions: RunDetail['exceptions']; onTake: (exceptionId: string) => void; onResolve: (exceptionId: string) => void }

export default function RunExceptions({ exceptions, onTake, onResolve }: RunExceptionsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Exceptions</CardTitle>
        <span className="text-xs text-muted-foreground tabular">{exceptions.length}</span>
      </CardHeader>
      {exceptions.length === 0 ? (
        <p className="border-t border-border px-4 py-6 text-sm text-muted-foreground">No exceptions on this run.</p>
      ) : (
        <div role="region" aria-label="Run exceptions, scrollable" tabIndex={0} className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[44rem] text-sm">
            <caption className="sr-only">Exceptions raised on this run, most severe first</caption>
            <thead>
              <tr className="bg-muted/60 text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">Severity</th>
                <th scope="col" className="px-4 py-2 font-medium">Exception</th>
                <th scope="col" className="px-4 py-2 font-medium">Status</th>
                <th scope="col" className="px-4 py-2 font-medium">Owner</th>
                <th scope="col" className="px-4 py-2 font-medium">Raised</th>
                <th scope="col" className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((e) => (
                <tr key={e.id} className="border-t border-border align-top">
                  <td className="px-4 py-2">
                    <SeverityBadge severity={e.severity} />
                  </td>
                  <th scope="row" className="min-w-56 px-4 py-2 text-left font-normal">
                    {e.title}
                  </th>
                  <td className="px-4 py-2">
                    <ExceptionStatusBadge status={e.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">{e.assignee ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                  <td className="whitespace-nowrap px-4 py-2 tabular">{formatShortDate(e.raisedOn)}</td>
                  <td className="px-4 py-2">
                    <ExceptionActions title={e.title} canTake={e.canTake} canResolve={e.canResolve} onTake={() => onTake(e.id)} onResolve={() => onResolve(e.id)} />
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
