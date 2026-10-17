import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import OutcomeMessage from '@/components/OutcomeMessage'
import PageHeader from '@/components/PageHeader'
import RunActions from '@/features/run-details/RunActions'
import RunExceptions from '@/features/run-details/RunExceptions'
import RunFacts from '@/features/run-details/RunFacts'
import RunTimeline from '@/features/run-details/RunTimeline'
import { buildRunDetail } from '@/features/run-details/runDetail'
import { countries, organizations, REFERENCE_DATE } from '@/fixtures'
import { usePayrollState } from '@/state/payroll/context'
import { useWorkflowAction } from '@/state/payroll/useWorkflowAction'

const backLink = (
  <Link to="/payroll-runs" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline">
    <ArrowLeft aria-hidden="true" className="size-4" />
    All payroll runs
  </Link>
)

/** Everything here is local to one run. The page keys this component by run, so none of it can carry over to another run. */
export default function RunDetailView({ runId }: { runId: string }) {
  const state = usePayrollState()
  const { message, bannerRef, perform } = useWorkflowAction()
  const run = useMemo(() => buildRunDetail({ today: REFERENCE_DATE, state, organizations, countries }, runId), [state, runId])

  if (!run) {
    return (
      <>
        {backLink}
        <PageHeader title="Payroll run not found" description="No payroll run has that ID." />
        <p className="max-w-prose rounded-lg border border-dashed border-input bg-card p-4 text-sm text-muted-foreground">
          Check the address, or choose a run from the list.
        </p>
      </>
    )
  }

  return (
    <>
      {backLink}
      <PageHeader title={`${run.organization} · ${run.country}`} description={`Payroll run ${run.id} · ${run.periodLabel}`} />
      <OutcomeMessage ref={bannerRef} message={message} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:col-span-8 xl:content-start">
          <RunFacts run={run} />
          <RunActions run={run} contextKey={state.events} onPerform={perform} />
          <RunExceptions
            exceptions={run.exceptions}
            onTake={(exceptionId) => perform({ type: 'exception/take', exceptionId }, 'You now own this exception (simulated).')}
            onResolve={(exceptionId) => perform({ type: 'exception/resolve', exceptionId }, 'Exception resolved (simulated).')}
          />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <RunTimeline timeline={run.timeline} />
        </div>
      </div>
    </>
  )
}
