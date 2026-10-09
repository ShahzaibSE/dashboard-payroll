import { Banknote } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { navGroups } from '@/app/navigation'

type PrimaryNavProps = { open: boolean; onNavigate: () => void }

/**
 * The only primary navigation landmark. On large screens it is a fixed sidebar; below that it is a
 * drawer that is removed from the layout (and the tab order) until the menu button opens it.
 */
export default function PrimaryNav({ open, onNavigate }: PrimaryNavProps) {
  return (
    <nav
      id="primary-nav"
      aria-label="Primary"
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex-col overflow-y-auto bg-sidebar text-sidebar-foreground lg:z-40 lg:flex lg:w-60',
        open ? 'flex' : 'hidden',
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <Banknote className="size-5 text-white" />
        <span className="text-base font-semibold text-white">PayrollOps</span>
      </div>

      <div className="flex-1 py-2">
        {navGroups.map((group) => {
          const headingId = `nav-group-${group.label.toLowerCase()}`
          return (
            <div key={group.label}>
              <p id={headingId} className="px-4 pb-1 pt-4 text-xs font-medium text-sidebar-muted">
                {group.label}
              </p>
              <ul aria-labelledby={headingId} className="px-2">
                {group.items.map(({ label, to, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'relative flex h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors focus-visible:outline-white focus-visible:-outline-offset-2',
                          isActive
                            ? 'bg-sidebar-active font-semibold text-sidebar-active-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-r before:bg-white'
                            : 'hover:bg-white/10 hover:text-white',
                        )
                      }
                    >
                      <Icon className="size-4 shrink-0" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p className="shrink-0 border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-muted">
        Synthetic demo data. No real employees, payments, or records.
      </p>
    </nav>
  )
}
