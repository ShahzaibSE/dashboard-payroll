import type { RouteObject } from 'react-router'
import AppShell from '@/app/AppShell'
import PlaceholderPage from '@/app/PlaceholderPage'
import OverviewPage from '@/features/overview/OverviewPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'payroll-runs', element: <PlaceholderPage title="Payroll runs" /> },
      { path: 'payroll-runs/:runId', element: <PlaceholderPage title="Payroll run details" /> },
      { path: 'exceptions', element: <PlaceholderPage title="Exceptions" /> },
      { path: 'approvals', element: <PlaceholderPage title="Approvals" /> },
      { path: 'audit', element: <PlaceholderPage title="Audit activity" /> },
      { path: 'employees', element: <PlaceholderPage title="Employees" /> },
      { path: '*', element: <PlaceholderPage title="Page not found" description="That address does not match a PayrollOps page." /> },
    ],
  },
]
