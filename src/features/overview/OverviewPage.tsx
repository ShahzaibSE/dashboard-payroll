import { useMemo } from 'react'
import KpiCard from '@/features/overview/KpiCard'
import NeedsAttention from '@/features/overview/NeedsAttention'
import PayrollByCountry from '@/features/overview/PayrollByCountry'
import RecentActivity from '@/features/overview/RecentActivity'
import RecentRuns from '@/features/overview/RecentRuns'
import RunStatusBreakdown from '@/features/overview/RunStatusBreakdown'
import { buildOverview } from '@/features/overview/summary'
import PageHeader from '@/components/PageHeader'
import { countries, organizations, REFERENCE_DATE } from '@/fixtures'
import { formatCompactUsd, formatInteger, formatShortDate, formatUsd } from '@/lib/format'
import { usePayrollState } from '@/state/payroll/context'

export default function OverviewPage() {
  const { runs, exceptions, events } = usePayrollState()
  const overview = useMemo(
    () => buildOverview({ today: REFERENCE_DATE, organizations, countries, runs, exceptions, events }),
    [runs, exceptions, events],
  )
  const { awaitingApproval, unresolvedExceptions, paymentsDue, cycle } = overview
  return (
    <>
      <PageHeader title="Overview" description={`${cycle.periodLabel} pay period · APAC and EMEA`} />

      <ul aria-label="Key figures" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <li>
          <KpiCard
            label="Awaiting approval"
            value={formatInteger(awaitingApproval.count)}
            detail={awaitingApproval.earliestPayDate ? `Earliest pay date ${formatShortDate(awaitingApproval.earliestPayDate)}` : 'No runs waiting'}
            href="/approvals"
          />
        </li>
        <li>
          <KpiCard
            label="Unresolved exceptions"
            value={formatInteger(unresolvedExceptions.count)}
            detail={`${unresolvedExceptions.critical} critical · ${unresolvedExceptions.high} high`}
            href="/exceptions"
          />
        </li>
        <li>
          <KpiCard
            label={`Payments due in ${paymentsDue.windowDays} days`}
            value={formatInteger(paymentsDue.count)}
            detail={`${formatUsd(paymentsDue.grossUsd)} gross, not yet paid`}
            href="/payroll-runs"
          />
        </li>
        <li>
          <KpiCard
            label={`Gross payroll, ${cycle.periodLabel}`}
            value={formatCompactUsd(cycle.grossUsd)}
            detail={`${formatInteger(cycle.employees)} employees · ${cycle.runs} runs`}
            href="/payroll-runs"
          />
        </li>
      </ul>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <NeedsAttention attention={overview.attention} className="min-w-0 xl:col-span-7" />
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:col-span-5 xl:content-start">
          <RunStatusBreakdown counts={overview.statusCounts} periodLabel={cycle.periodLabel} />
          <PayrollByCountry totals={overview.countryTotals} regionTotals={overview.regionTotals} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <RecentRuns rows={overview.recentRuns} className="min-w-0 xl:col-span-7" />
        <RecentActivity rows={overview.activity} className="min-w-0 xl:col-span-5" />
      </div>
    </>
  )
}
