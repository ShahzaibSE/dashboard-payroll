import type { RouteObject } from 'react-router'
import AppLayout from '@/app/AppLayout'
import PlaceholderPage from '@/app/PlaceholderPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <PlaceholderPage title="Overview" /> },
      { path: 'payroll-runs', element: <PlaceholderPage title="Payroll runs" /> },
      { path: 'payroll-runs/:runId', element: <PlaceholderPage title="Payroll run details" /> },
      { path: '*', element: <PlaceholderPage title="Page not found" /> },
    ],
  },
]
