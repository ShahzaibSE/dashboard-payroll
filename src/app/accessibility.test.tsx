import { screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/renderApp'

// Measured: the slowest test here takes about 1 s on an idle machine and over 3x that under heavy CPU load, so the 5 s default leaves too little margin.
vi.setConfig({ testTimeout: 15_000 })

// Every route, in populated, filtered, empty, and not-found states.
const pages: [string, string][] = [
  ['/', 'Overview'],
  ['/payroll-runs', 'Payroll runs'],
  ['/payroll-runs?status=on_hold&sort=gross&dir=desc', 'Payroll runs'],
  ['/payroll-runs?q=zzzz', 'Payroll runs'],
  ['/payroll-runs/run-2026-10-010', 'Orchard Row Retail · United Kingdom'],
  ['/payroll-runs/run-2026-10-006', 'Quillon Labs · United Kingdom'],
  ['/payroll-runs/run-nope', 'Payroll run not found'],
  ['/exceptions', 'Exceptions'],
  ['/exceptions?status=all&sort=run&dir=desc', 'Exceptions'],
  ['/exceptions?status=resolved&severity=critical', 'Exceptions'],
  ['/approvals', 'Approvals'],
  ['/audit', 'Audit activity'],
  ['/audit?kind=run.approved&actor=Mei+Tanaka', 'Audit activity'],
  ['/employees', 'Employees'],
  ['/employees?page=4&sort=country&dir=desc', 'Employees'],
  ['/employees?q=zzzz', 'Employees'],
  ['/does-not-exist', 'Page not found'],
]

describe.each(pages)('%s', (path, heading) => {
  it('has one h1, the shell landmarks, the simulation disclosure, and no detectable accessibility violations', async () => {
    const { container } = renderApp(path)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('Simulated – changes are local and not saved')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset demo data' })).toBeInTheDocument()
    expect((await axe(container)).violations).toEqual([])
  })
})

describe('whole-app invariants', () => {
  it('never shows more than one role=status region at a time on any page', () => {
    for (const [path] of pages) {
      const { unmount } = renderApp(path)
      expect(screen.queryAllByRole('status').length).toBeLessThanOrEqual(1)
      unmount()
    }
  })

  it('names every table, and every scrollable table region can be focused and is named', () => {
    for (const [path] of pages) {
      const { unmount } = renderApp(path)
      for (const table of screen.queryAllByRole('table')) expect(table).toHaveAccessibleName()
      for (const region of screen.queryAllByRole('region')) {
        expect(region).toHaveAccessibleName()
        expect(region).toHaveAttribute('tabindex', '0')
      }
      unmount()
    }
  })
})
