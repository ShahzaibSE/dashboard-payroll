import type { RouteObject } from 'react-router'
import AppShell from '@/app/AppShell'
import PlaceholderPage from '@/app/PlaceholderPage'
import ApprovalsPage from '@/features/approvals/ApprovalsPage'
import AuditPage from '@/features/audit/AuditPage'
import EmployeesPage from '@/features/employees/EmployeesPage'
import ExceptionsPage from '@/features/exceptions/ExceptionsPage'
import OverviewPage from '@/features/overview/OverviewPage'
import RunDetailPage from '@/features/run-details/RunDetailPage'
import PayrollRunsPage from '@/features/payroll-runs/PayrollRunsPage'
import PayrollStateProvider from '@/state/payroll/PayrollStateProvider'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <PayrollStateProvider>
        <AppShell />
      </PayrollStateProvider>
    ),
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'payroll-runs', element: <PayrollRunsPage /> },
      { path: 'payroll-runs/:runId', element: <RunDetailPage /> },
      { path: 'exceptions', element: <ExceptionsPage /> },
      { path: 'approvals', element: <ApprovalsPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: '*', element: <PlaceholderPage title="Page not found" description="That address does not match a PayrollOps page." /> },
    ],
  },
]
