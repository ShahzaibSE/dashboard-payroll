import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import ApprovalsPage from '@/features/approvals/ApprovalsPage'
import PayrollStateProvider from '@/state/payroll/PayrollStateProvider'
import { createInitialState } from '@/state/payroll/reducer'
import { renderApp } from '@/test/renderApp'

const card = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section') as HTMLElement
const nav = (name: string) => within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name })
const queueRows = () => within(within(card('Awaiting approval')).getByRole('table')).getAllByRole('row').slice(1)

describe('Approvals page', () => {
  it('shows the approval queue with pay dates and blockers, and the decisions made so far', () => {
    renderApp('/approvals')

    expect(screen.getByRole('heading', { level: 1, name: 'Approvals' })).toBeInTheDocument()
    expect(screen.getByText('6 runs awaiting approval · open a run to approve or reject it')).toBeInTheDocument()
    const rows = queueRows()
    expect(rows).toHaveLength(6)
    expect(within(rows[0]).getByRole('rowheader')).toHaveTextContent('Orchard Row Retail · United Kingdom')
    expect(within(rows[0]).getByText('in 2 days')).toBeInTheDocument()
    expect(within(rows[0]).getByText('1 critical exception')).toBeInTheDocument()
    expect(within(rows[1]).getByText('None')).toBeInTheDocument()
    expect(within(rows[0]).getByRole('link', { name: 'Review run: Orchard Row Retail · United Kingdom' })).toHaveAttribute('href', '/payroll-runs/run-2026-10-010')

    // WCAG 2.5.3 (Label in Name): every link's accessible name must contain its visible text, so speech-input users can say it.
    for (const row of rows) {
      const link = within(row).getByRole('link')
      expect(link).toHaveAccessibleName(expect.stringContaining('Review run'))
      expect(link.childNodes[0].textContent).toBe('Review run')
    }

    const decisions = within(card('Recent decisions')).getAllByRole('listitem')
    expect(decisions).toHaveLength(1)
    expect(decisions[0]).toHaveTextContent('Approved by Sofia Lindqvist: Lumen Foods Group · France')
    expect(within(decisions[0]).getByText('11 Oct, 17:48 UTC')).toHaveAttribute('datetime', '2026-10-11T17:48Z')
  })

  it('offers no decision controls here, only a way to open each run', () => {
    renderApp('/approvals')

    expect(screen.queryByRole('button', { name: /approve|reject/i })).not.toBeInTheDocument()
  })

  it('reflects a decision made on the run page, and Reset undoes it', async () => {
    const user = userEvent.setup()
    renderApp('/approvals')

    await user.click(within(queueRows()[4]).getByRole('link', { name: /^Review run: Kestrel Analytics · Singapore/ }))
    await user.click(screen.getByRole('button', { name: 'Approve run' }))
    await user.click(screen.getByRole('button', { name: 'Confirm approval' }))
    await user.click(nav('Approvals'))

    expect(screen.getByText('5 runs awaiting approval · open a run to approve or reject it')).toBeInTheDocument()
    expect(queueRows()).toHaveLength(5)
    const decisions = within(card('Recent decisions')).getAllByRole('listitem')
    expect(decisions[0]).toHaveTextContent('Approved by Sofia Lindqvist: Kestrel Analytics · Singapore')
    expect(within(decisions[0]).getByText('Today, 09:42 UTC')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))
    expect(queueRows()).toHaveLength(6)
    expect(within(card('Recent decisions')).getAllByRole('listitem')).toHaveLength(1)
  })

  it('shows a rejection with its reason, and a resolved blocker clears the blocking note', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-011')
    await user.click(screen.getByRole('button', { name: 'Reject run' }))
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejection' }), 'Allowances are not confirmed.')
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    await user.click(nav('Approvals'))

    expect(queueRows()).toHaveLength(5)
    const first = within(card('Recent decisions')).getAllByRole('listitem')[0]
    expect(first).toHaveTextContent('Rejected by Sofia Lindqvist: Tidewater Health · Netherlands')
    expect(first).toHaveTextContent('Reason: Allowances are not confirmed.')

    await user.click(nav('Exceptions'))
    await user.click(screen.getByRole('button', { name: /^Resolve: Net pay differs/ }))
    await user.click(nav('Approvals'))
    expect(within(queueRows()[0]).getByText('None')).toBeInTheDocument()
  })

  it('shows empty states when nothing awaits approval and nothing was decided', () => {
    const initial = createInitialState()
    render(
      <MemoryRouter>
        <PayrollStateProvider initialState={{ ...initial, runs: initial.runs.filter((r) => r.status !== 'pending_approval'), events: [] }}>
          <ApprovalsPage />
        </PayrollStateProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('0 runs awaiting approval · open a run to approve or reject it')).toBeInTheDocument()
    expect(within(card('Awaiting approval')).getByText('No runs are waiting for approval.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(within(card('Recent decisions')).getByText('No approval decisions have been recorded.')).toBeInTheDocument()
  })

  it('says "1 run" in the singular', () => {
    const initial = createInitialState()
    render(
      <MemoryRouter>
        <PayrollStateProvider initialState={{ ...initial, runs: initial.runs.filter((r) => r.status !== 'pending_approval' || r.id === 'run-2026-10-014') }}>
          <ApprovalsPage />
        </PayrollStateProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('1 run awaiting approval · open a run to approve or reject it')).toBeInTheDocument()
  })

  it('is reachable from the Overview, and has no detectable accessibility violations', async () => {
    const user = userEvent.setup()
    const { router, container } = renderApp('/')

    await user.click(within(screen.getByRole('list', { name: 'Key figures' })).getByRole('link', { name: /Awaiting approval/ }))
    expect(router.state.location.pathname).toBe('/approvals')
    expect(screen.getByRole('region', { name: 'Runs awaiting approval, scrollable' })).toHaveAttribute('tabindex', '0')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect((await axe(container)).violations).toEqual([])
  })
})
