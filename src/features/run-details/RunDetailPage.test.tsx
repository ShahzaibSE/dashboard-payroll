import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

const card = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section') as HTMLElement

describe('Payroll run detail page', () => {
  it('shows the run header, summary, exceptions and activity', () => {
    renderApp('/payroll-runs/run-2026-10-010')

    expect(screen.getByRole('heading', { level: 1, name: 'Orchard Row Retail · United Kingdom' })).toBeInTheDocument()
    expect(screen.getByText('Payroll run run-2026-10-010 · October 2026')).toBeInTheDocument()
    const summary = card('Run summary')
    expect(within(summary).getByText('Awaiting approval')).toBeInTheDocument()
    expect(within(summary).getByText('14 Oct 2026')).toBeInTheDocument()
    expect(within(summary).getByText('in 2 days')).toBeInTheDocument()
    expect(within(summary).getByText('318')).toBeInTheDocument()
    expect(within(summary).getByText('$1,852,032')).toBeInTheDocument()
    expect(within(summary).getByText('$5,824')).toBeInTheDocument()
    expect(within(summary).getByText('Local currency GBP')).toBeInTheDocument()

    const rows = within(within(card('Exceptions')).getByRole('table')).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Critical')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Open')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Unassigned')).toBeInTheDocument()
    expect(within(rows[1]).getByText('In progress')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Daniel Reyes')).toBeInTheDocument()

    const items = within(card('Run activity')).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Lucas Brandt submitted the run for approval')
    expect(within(items[0]).getByText('Today, 09:41 UTC')).toHaveAttribute('datetime', '2026-10-12T09:41Z')
  })

  it.each([
    ['run-2026-10-021', 'Draft'],
    ['run-2026-10-016', 'In review'],
    ['run-2026-10-014', 'Awaiting approval'],
    ['run-2026-10-009', 'Approved'],
    ['run-2026-10-006', 'Paid'],
    ['run-2026-10-023', 'On hold'],
  ])('renders %s with status %s', (id, status) => {
    renderApp(`/payroll-runs/${id}`)

    expect(within(card('Run summary')).getByText(status)).toBeInTheDocument()
  })

  it('shows empty states for a run with no exceptions or activity', () => {
    renderApp('/payroll-runs/run-2026-10-014')

    expect(within(card('Exceptions')).getByText('No exceptions on this run.')).toBeInTheDocument()
    expect(within(card('Run activity')).getByText('No activity recorded for this run.')).toBeInTheDocument()
  })

  it('says so when the run does not exist, and links back to the list', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/payroll-runs/run-nope')

    expect(screen.getByRole('heading', { level: 1, name: 'Payroll run not found' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'All payroll runs' }))

    expect(router.state.location.pathname).toBe('/payroll-runs')
  })

  it('is reachable from the Overview and from the runs list, and returns to the list', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/')

    await user.click(within(screen.getByRole('heading', { level: 2, name: 'Needs attention' }).closest('section') as HTMLElement).getByRole('link', { name: /Orchard Row Retail · United Kingdom\s*Pay date 14 Oct/ }))
    expect(router.state.location.pathname).toBe('/payroll-runs/run-2026-10-010')

    await user.click(screen.getByRole('link', { name: 'All payroll runs' }))
    // The list starts with the earliest pay date: Lumen Foods Group in the Philippines, run 003.
    await user.click(within(screen.getAllByRole('row')[1]).getByRole('link', { name: 'Lumen Foods Group' }))
    expect(router.state.location.pathname).toBe('/payroll-runs/run-2026-10-003')
  })

  it('keeps the simulation disclosure visible and has no detectable accessibility violations', async () => {
    const { container } = renderApp('/payroll-runs/run-2026-10-010')

    expect(screen.getByText('Simulated – changes are local and not saved')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const results = await axe(container)
    expect(results.violations).toEqual([])
  })
})
