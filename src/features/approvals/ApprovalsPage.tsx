import { useMemo } from 'react'
import PageHeader from '@/components/PageHeader'
import ApprovalQueue from '@/features/approvals/ApprovalQueue'
import RecentDecisions from '@/features/approvals/RecentDecisions'
import { buildApprovals } from '@/features/approvals/approvals'
import { countries, organizations, REFERENCE_DATE } from '@/fixtures'
import { usePayrollState } from '@/state/payroll/context'

/** Where the queue is worked: decisions are made on each run's own page, where the full context is visible. */
export default function ApprovalsPage() {
  const state = usePayrollState()
  const { queue, decisions } = useMemo(() => buildApprovals({ today: REFERENCE_DATE, state, organizations, countries }), [state])

  return (
    <>
      <PageHeader
        title="Approvals"
        description={queue.length === 1 ? '1 run awaiting approval · open a run to approve or reject it' : `${queue.length} runs awaiting approval · open a run to approve or reject it`}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <ApprovalQueue queue={queue} />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <RecentDecisions decisions={decisions} />
        </div>
      </div>
    </>
  )
}
