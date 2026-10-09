import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Menu, X } from 'lucide-react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import PrimaryNav from '@/app/PrimaryNav'
import SimulationNotice from '@/app/SimulationNotice'
import { Button } from '@/components/ui/button'

export default function AppShell() {
  const location = useLocation()
  const routeKey = location.pathname + location.search
  // Navigating always closes the menu, including Back and Forward: reset it during render when the route changes.
  const [menu, setMenu] = useState({ open: false, routeKey })
  if (menu.routeKey !== routeKey) setMenu({ open: false, routeKey })
  const open = menu.open && menu.routeKey === routeKey
  const menuButton = useRef<HTMLButtonElement>(null)
  const main = useRef<HTMLElement>(null)
  const previousPath = useRef(location.pathname)

  // After a client-side navigation, move focus to the new page content (never on first load).
  useEffect(() => {
    if (previousPath.current === location.pathname) return
    previousPath.current = location.pathname
    main.current?.focus({ preventScroll: true })
  }, [location.pathname])

  function closeMenu() {
    setMenu({ open: false, routeKey })
  }

  // Choosing a destination (even the current page) must not strand focus inside a menu that just closed.
  function onNavigate() {
    closeMenu()
    main.current?.focus({ preventScroll: true })
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      closeMenu()
      menuButton.current?.focus()
    }
  }

  return (
    <div onKeyDown={onKeyDown}>
      <a
        href="#main"
        className="sr-only rounded-md bg-card px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60]"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-card lg:pl-60">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 lg:min-h-14 lg:px-8">
          <Button
            ref={menuButton}
            variant="outline"
            size="sm"
            className="lg:hidden"
            aria-expanded={open}
            aria-controls="primary-nav"
            onClick={() => setMenu({ open: !open, routeKey })}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
            Menu
          </Button>
          <span className="font-semibold lg:hidden">PayrollOps</span>
          <p className="hidden text-sm text-muted-foreground lg:block">APAC and EMEA payroll operations</p>
          <div className="w-full sm:ml-auto sm:w-auto">
            <SimulationNotice />
          </div>
        </div>
      </header>

      <PrimaryNav open={open} onNavigate={onNavigate} />
      {open ? <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closeMenu} /> : null}

      <ScrollRestoration />
      <main id="main" ref={main} tabIndex={-1} className="outline-none lg:pl-60">
        <div className="mx-auto max-w-[88rem] px-4 py-5 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
