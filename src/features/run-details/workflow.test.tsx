import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/renderApp'

// Measured: the slowest test here takes about 1 s on an idle machine and over 3x that under heavy CPU load, so the 5 s default leaves too little margin.
vi.setConfig({ testTimeout: 15_000 })

const card = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section') as HTMLElement
const nav = (name: string) => within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name })
const figure = (pattern: RegExp) => within(screen.getByRole('list', { name: 'Key figures' })).getByRole('link', { name: pattern })

async function approveKestrelSingapore(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Approve run' }))
  await user.click(screen.getByRole('button', { name: 'Confirm approval' }))
}

describe('one workflow, every view', () => {
  it('shows an approval on the run, the Overview, and the runs list, and Reset undoes it everywhere', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-014')
    await approveKestrelSingapore(user)

    await user.click(nav('Overview'))
    expect(figure(/Awaiting approval\s*5\s*Earliest pay date 14 Oct/)).toBeInTheDocument()
    const attention = card('Needs attention')
    expect(within(attention).getByRole('heading', { level: 3, name: /Awaiting approval \(5\)/ })).toBeInTheDocument()
    expect(within(attention).queryByRole('link', { name: /Kestrel Analytics · Singapore/ })).not.toBeInTheDocument()
    expect(within(card('Runs by status')).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Draft2', 'In review5', 'Awaiting approval5', 'Approved4', 'Paid6', 'On hold2'])
    expect(within(card('Recent activity')).getAllByRole('listitem')[0]).toHaveTextContent('Sofia Lindqvist approved the run Kestrel Analytics · Singapore')
    // Recent runs are ordered by last update, ties by run id. Six rows fit: runs 009, 010, 011, 013, 014 (now updated on 12 Oct) and 016.
    const recent = within(card('Recent payroll runs')).getAllByRole('row')
    expect(recent).toHaveLength(7)
    expect(recent[5]).toHaveTextContent('Kestrel AnalyticsSingapore20 Oct52$328,848Approved')

    await user.click(nav('Payroll runs'))
    const row = screen.getAllByRole('row').find((r) => r.textContent?.includes('run-2026-10-014')) as HTMLElement
    expect(within(row).getByText('Approved')).toBeInTheDocument()
    expect(within(row).getByText('12 Oct')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))
    const resetRow = screen.getAllByRole('row').find((r) => r.textContent?.includes('run-2026-10-014')) as HTMLElement
    expect(within(resetRow).getByText('Awaiting approval')).toBeInTheDocument()
    expect(within(resetRow).getByText('10 Oct')).toBeInTheDocument()

    await user.click(nav('Overview'))
    expect(figure(/Awaiting approval\s*6/)).toBeInTheDocument()
    expect(within(card('Recent activity')).getAllByRole('listitem')[0]).toHaveTextContent('Lucas Brandt submitted the run for approval')
    expect(within(card('Runs by status')).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Draft2', 'In review5', 'Awaiting approval6', 'Approved3', 'Paid6', 'On hold2'])
  })

  it('updates the unresolved exception counts when an exception is resolved', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-010')
    expect(screen.getByRole('button', { name: 'Approve run' })).toHaveAttribute('aria-disabled', 'true')

    await user.click(screen.getByRole('button', { name: /^Resolve: Net pay differs/ }))
    await user.click(nav('Overview'))

    expect(figure(/Unresolved exceptions\s*11\s*2 critical · 4 high/)).toBeInTheDocument()
    expect(within(card('Needs attention')).getByRole('heading', { level: 3, name: /Critical exceptions \(2\)/ })).toBeInTheDocument()
  })

  it('moves a rejected run out of the approval queue and into review', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-011')
    await user.click(screen.getByRole('button', { name: 'Reject run' }))
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejection' }), 'Allowance rates are unconfirmed.')
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))

    await user.click(nav('Overview'))

    expect(figure(/Awaiting approval\s*5/)).toBeInTheDocument()
    expect(within(card('Runs by status')).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Draft2', 'In review6', 'Awaiting approval5', 'Approved3', 'Paid6', 'On hold2'])
    expect(within(card('Recent activity')).getAllByRole('listitem')[0]).toHaveTextContent('rejected the run and returned it to review: Tidewater Health · Netherlands')
  })

  it('hides a stale outcome message after Reset on the same page, and keeps focus on the Reset button', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-014')
    await approveKestrelSingapore(user)
    expect(screen.getByRole('status')).toHaveTextContent('Run approved (simulated)')

    const reset = screen.getByRole('button', { name: 'Reset demo data' })
    await user.click(reset)

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(within(card('Run summary')).getByText('Awaiting approval')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve run' })).toBeEnabled()
    expect(within(card('Run activity')).getByText('No activity recorded for this run.')).toBeInTheDocument()
    expect(reset).toHaveFocus()
  })

  it('does not bring back a confirmation after Reset: Submit, open Approve, Reset, Submit again', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-016')

    await user.click(screen.getByRole('button', { name: 'Submit for approval' }))
    await user.click(screen.getByRole('button', { name: 'Approve run' }))
    expect(screen.getByRole('group', { name: 'Approve this run?' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))
    expect(within(card('Run summary')).getByText('In review')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Submit for approval' }))

    expect(within(card('Run summary')).getByText('Awaiting approval')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Run submitted for approval (simulated)')
    expect(screen.getByRole('status')).toHaveFocus()
    // A new confirmation appears only when the user asks for it.
    await user.click(screen.getByRole('button', { name: 'Approve run' }))
    expect(screen.getByRole('group', { name: 'Approve this run?' })).toBeInTheDocument()
  })

  it('closes a confirmation, and discards its draft, when the workflow changes underneath it', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-011')

    await user.click(screen.getByRole('button', { name: 'Reject run' }))
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejection' }), 'half written draft')
    await user.click(screen.getByRole('button', { name: /^Take ownership: Overtime above the statutory cap/ }))

    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveFocus()
    expect(within(card('Run summary')).getByText('Awaiting approval')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reject run' }))
    expect(screen.getByRole('textbox', { name: 'Reason for rejection' })).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('closes a confirmation when Reset undoes earlier changes, even though the run still looks the same', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-011')

    await user.click(screen.getByRole('button', { name: /^Take ownership: Overtime above the statutory cap/ }))
    await user.click(screen.getByRole('button', { name: 'Approve run' }))
    expect(screen.getByRole('group', { name: 'Approve this run?' })).toBeInTheDocument()

    const reset = screen.getByRole('button', { name: 'Reset demo data' })
    await user.click(reset)

    // The run is Awaiting approval before and after, so only the workflow state itself can tell the confirmation is out of date.
    expect(within(card('Run summary')).getByText('Awaiting approval')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve run' })).toBeEnabled()
    expect(reset).toHaveFocus()
  })

  it('keeps a confirmation open when Reset changes nothing', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-011')

    await user.click(screen.getByRole('button', { name: 'Approve run' }))
    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))

    expect(screen.getByRole('group', { name: 'Approve this run?' })).toBeInTheDocument()
  })

  it('gives every run its own outcome message, confirmation, and reject draft', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/payroll-runs/run-2026-10-014')
    await approveKestrelSingapore(user)
    expect(screen.getByRole('status')).toHaveTextContent('Run approved (simulated)')

    await act(() => router.navigate('/payroll-runs/run-2026-10-011'))

    expect(screen.getByRole('heading', { level: 1, name: 'Tidewater Health · Netherlands' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()

    await user.click(screen.getByRole('button', { name: 'Reject run' }))
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejection' }), 'short')
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await act(() => router.navigate('/payroll-runs/run-2026-10-012'))

    expect(screen.getByRole('heading', { level: 1, name: 'Quillon Labs · Germany' })).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reject run' }))
    expect(screen.getByRole('textbox', { name: 'Reason for rejection' })).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not carry an open approval confirmation to another run', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/payroll-runs/run-2026-10-011')
    await user.click(screen.getByRole('button', { name: 'Approve run' }))
    expect(screen.getByRole('group', { name: 'Approve this run?' })).toBeInTheDocument()

    await act(() => router.navigate('/payroll-runs/run-2026-10-012'))

    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(within(card('Run summary')).getByText('Awaiting approval')).toBeInTheDocument()
  })

  it('does not dispatch anything when a confirmation is dismissed or discarded', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/payroll-runs/run-2026-10-011')

    await user.click(screen.getByRole('button', { name: 'Approve run' }))
    await act(() => router.navigate('/payroll-runs/run-2026-10-012'))
    await act(() => router.navigate('/payroll-runs/run-2026-10-011'))

    expect(within(card('Run summary')).getByText('Awaiting approval')).toBeInTheDocument()
    expect(within(card('Run activity')).getByText('No activity recorded for this run.')).toBeInTheDocument()
  })

  it('announces every Reset, with one live region and a different message each time', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/')
    const reset = screen.getByRole('button', { name: 'Reset demo data' })

    await user.click(reset)
    const first = screen.getByText('Demo data reset to the original synthetic data (reset 1).')
    expect(first).toHaveAttribute('aria-live', 'polite')

    await user.click(reset)
    expect(screen.queryByText(/\(reset 1\)/)).not.toBeInTheDocument()
    expect(screen.getByText('Demo data reset to the original synthetic data (reset 2).')).toBeInTheDocument()
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1)
    expect(reset).toHaveFocus()
  })

  it('discloses on every page that actions are simulated', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-014')

    expect(screen.getByText('Simulated – changes are local and not saved')).toBeInTheDocument()
    expect(within(card('Review and approval')).getByText(/Simulated workflow.*No payment is made and nothing is saved/)).toBeInTheDocument()
    await user.click(nav('Overview'))
    expect(screen.getByText('Simulated – changes are local and not saved')).toBeInTheDocument()
  })
})
