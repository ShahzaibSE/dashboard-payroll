import {
  ClipboardCheck,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = { label: string; to: string; icon: LucideIcon; end?: boolean }
export type NavGroup = { label: string; items: NavItem[] }

export const navGroups: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Overview', to: '/', icon: LayoutDashboard, end: true },
      { label: 'Payroll runs', to: '/payroll-runs', icon: FileSpreadsheet },
      { label: 'Exceptions', to: '/exceptions', icon: TriangleAlert },
      { label: 'Approvals', to: '/approvals', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Records',
    items: [
      { label: 'Audit activity', to: '/audit', icon: History },
      { label: 'Employees', to: '/employees', icon: Users },
    ],
  },
]
