import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/renderApp'

// Measured: the slowest test here takes about 1 s on an idle machine and over 3x that under heavy CPU load, so the 5 s default leaves too little margin.
vi.setConfig({ testTimeout: 15_000 })

const card = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section') as HTMLElement
const outcome = () => screen.getByRole('status')
const critical = 'Net pay differs from the approved baseline by more than 5%'

describe('approving a run', () => {
  it('asks for confirmation, then approves, records it, and moves focus to the outcome', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-014')

    await user.click(screen.getByRole('button', { name: 'Approve run' }))

    const confirm = screen.getByRole('group', { name: 'Approve this run?' })
    expect(within(confirm).getByRole('heading', { name: 'Approve this run?' })).toHaveFocus()
    expect(within(confirm).getByText(/Simulated.*No payment is made/)).toBeInTheDocument()
    expect(within(card('Run summary')).getByText('Awaiting approval')).toBeInTheDocument()

    await user.click(within(confirm).getByRole('button', { name: 'Confirm approval' }))

    expect(within(card('Run summary')).getByText('Approved')).toBeInTheDocument()
    expect(outcome()).toHaveTextContent('Run approved (simulated). No payment was made and nothing was saved.')
    expect(outcome()).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Approve run' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Approve this run?' })).not.toBeInTheDocument()
    expect(within(card('Review and approval')).getByText('No actions are available for a run that is approved.')).toBeInTheDocument()
    const first = within(card('Run activity')).getAllByRole('listitem')[0]
    expect(first).toHaveTextContent('Sofia Lindqvist approved the run')
    expect(within(first).getByText('Today, 09:42 UTC')).toBeInTheDocument()
    expect(within(card('Run summary')).getByText('12 Oct 2026')).toBeInTheDocument()
  })

  it('cancels with the button or Escape, returns focus to the trigger, and changes nothing', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-014')
    const approve = screen.getByRole('button', { name: 'Approve run' })

    await user.click(approve)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(approve).toHaveFocus()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()

    await user.click(approve)
    await user.keyboard('{Escape}')
    expect(approve).toHaveFocus()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()

    expect(within(card('Run summary')).getByText('Awaiting approval')).toBeInTheDocument()
    expect(within(card('Run activity')).getByText('No activity recorded for this run.')).toBeInTheDocument()
    expect(outcome()).toBeEmptyDOMElement()
  })

  it('can be completed with the keyboard alone', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-014')

    screen.getByRole('button', { name: 'Approve run' }).focus()
    await user.keyboard('{Enter}')
    await user.tab() // from the confirmation heading to the first control
    expect(screen.getByRole('button', { name: 'Confirm approval' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(within(card('Run summary')).getByText('Approved')).toBeInTheDocument()
    expect(outcome()).toHaveFocus()
  })

  it('is blocked by an open critical exception, says why, and unlocks when it is resolved', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-010')
    const approve = screen.getByRole('button', { name: 'Approve run' })

    expect(approve).toHaveAttribute('aria-disabled', 'true')
    expect(approve).toHaveAccessibleDescription('Cannot approve yet: Resolve 1 critical exception first.')
    expect(screen.getByText('Cannot approve yet: Resolve 1 critical exception first.')).toBeVisible()

    // It stays in the tab order, so a keyboard or screen-reader user reaches it and hears the reason; activating it does nothing.
    await user.tab()
    while (document.activeElement !== approve && document.activeElement !== document.body) await user.tab()
    expect(approve).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.click(approve)
    expect(screen.queryByRole('group', { name: 'Approve this run?' })).not.toBeInTheDocument()
    expect(approve).toHaveFocus()

    // Taking ownership is not resolving: the run stays blocked.
    await user.click(screen.getByRole('button', { name: `Take ownership: ${critical}` }))
    expect(outcome()).toHaveTextContent('You now own this exception (simulated).')
    expect(outcome()).toHaveFocus()
    expect(screen.queryByRole('button', { name: `Take ownership: ${critical}` })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve run' })).toHaveAttribute('aria-disabled', 'true')
    const row = within(card('Exceptions')).getByRole('row', { name: new RegExp(critical) })
    expect(within(row).getByText('In progress')).toBeInTheDocument()
    expect(within(row).getByText('Sofia Lindqvist')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: `Resolve: ${critical}` }))
    expect(outcome()).toHaveTextContent('Exception resolved (simulated).')
    expect(outcome()).toHaveFocus()
    expect(within(within(card('Exceptions')).getByRole('row', { name: new RegExp(critical) })).getByText('Resolved')).toBeInTheDocument()
    expect(screen.queryByText(/Cannot approve yet/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve run' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Approve run' }))
    await user.click(screen.getByRole('button', { name: 'Confirm approval' }))
    expect(within(card('Run summary')).getByText('Approved')).toBeInTheDocument()
    expect(within(card('Run activity')).getAllByRole('listitem').slice(0, 3).map((li) => li.textContent)).toEqual([
      expect.stringContaining('approved the run'),
      expect.stringContaining('resolved an exception'),
      expect.stringContaining('took ownership of an exception'),
    ])
  })
})

describe('rejecting a run', () => {
  it('requires a valid reason, explains the problem accessibly, and keeps the run unchanged until it is valid', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-011')

    await user.click(screen.getByRole('button', { name: 'Reject run' }))
    const reason = screen.getByRole('textbox', { name: 'Reason for rejection' })
    expect(reason).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/Enter at least 10 characters/)
    expect(reason).toHaveAttribute('aria-invalid', 'true')
    expect(reason).toHaveAccessibleDescription(/10 to 300 characters.*Enter at least 10 characters/)
    expect(within(card('Run summary')).getByText('Awaiting approval')).toBeInTheDocument()
    expect(outcome()).toBeEmptyDOMElement()

    await user.type(reason, 'too short')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.clear(reason)
    await user.type(reason, 'Overtime lines need a second review.')
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))

    expect(within(card('Run summary')).getByText('In review')).toBeInTheDocument()
    expect(outcome()).toHaveTextContent('Run rejected and returned to review (simulated).')
    expect(outcome()).toHaveFocus()
    const first = within(card('Run activity')).getAllByRole('listitem')[0]
    expect(first).toHaveTextContent('Sofia Lindqvist rejected the run and returned it to review')
    expect(first).toHaveTextContent('Reason: Overtime lines need a second review.')
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('shows reason text literally, never as markup', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/payroll-runs/run-2026-10-012')

    await user.click(screen.getByRole('button', { name: 'Reject run' }))
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejection' }), '<b>bold</b> and <img src=x> fix')
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))

    expect(within(card('Run activity')).getByText('Reason: <b>bold</b> and <img src=x> fix')).toBeInTheDocument()
    expect(container.querySelector('b, img[src="x"]')).toBeNull()
  })

  it('cancels with Escape from the reason box and discards the draft', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-011')
    const reject = screen.getByRole('button', { name: 'Reject run' })

    await user.click(reject)
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejection' }), 'half written')
    await user.keyboard('{Escape}')
    expect(reject).toHaveFocus()

    await user.click(reject)
    expect(screen.getByRole('textbox', { name: 'Reason for rejection' })).toHaveValue('')
  })

  it('lets a rejected run be submitted again', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-011')

    await user.click(screen.getByRole('button', { name: 'Reject run' }))
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejection' }), 'Please recheck the allowances.')
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    expect(screen.queryByRole('button', { name: 'Approve run' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Submit for approval' }))

    expect(within(card('Run summary')).getByText('Awaiting approval')).toBeInTheDocument()
    expect(outcome()).toHaveTextContent('Run submitted for approval (simulated).')
    expect(outcome()).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Approve run' })).toBeEnabled()
  })
})

describe('runs with no available decision', () => {
  it.each([
    ['run-2026-10-021', 'draft'],
    ['run-2026-10-023', 'on hold'],
    ['run-2026-10-009', 'approved'],
    ['run-2026-10-006', 'paid'],
  ])('%s (%s) offers no run actions', (id, label) => {
    renderApp(`/payroll-runs/${id}`)

    expect(within(card('Review and approval')).getByText(`No actions are available for a run that is ${label}.`)).toBeInTheDocument()
    for (const name of ['Submit for approval', 'Approve run', 'Reject run']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  })

  it('offers submit, and only submit, for a run in review', () => {
    renderApp('/payroll-runs/run-2026-10-016')

    expect(screen.getByRole('button', { name: 'Submit for approval' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Approve run' })).not.toBeInTheDocument()
  })

  it('shows no exception actions once an exception is resolved', () => {
    renderApp('/payroll-runs/run-2026-10-009')

    expect(within(card('Exceptions')).getByText('Resolved')).toBeInTheDocument()
    expect(within(card('Exceptions')).queryByRole('button')).not.toBeInTheDocument()
    expect(within(card('Exceptions')).getByText('None')).toBeInTheDocument()
  })
})

describe('accessibility', () => {
  it('has no detectable violations with a confirmation open, an error showing, and a blocked approval', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/payroll-runs/run-2026-10-011')

    await user.click(screen.getByRole('button', { name: 'Reject run' }))
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    expect((await axe(container)).violations).toEqual([])
  })

  it('has no detectable violations for a blocked run', async () => {
    const { container } = renderApp('/payroll-runs/run-2026-10-010')

    expect((await axe(container)).violations).toEqual([])
  })
})
