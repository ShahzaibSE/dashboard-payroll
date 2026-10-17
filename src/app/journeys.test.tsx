import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

type User = ReturnType<typeof userEvent.setup>

// These walk through many pages with real user events. They take a few seconds when the whole suite runs in parallel, so they get
// far more than the 5 second default; the limit is a safety net, not part of what is being tested.
const JOURNEY_TIMEOUT_MS = 30_000

const nav = (name: string) => within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name })
const card = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section') as HTMLElement
const kpi = (pattern: RegExp) => within(screen.getByRole('list', { name: 'Key figures' })).getByRole('link', { name: pattern })
const tableRows = () => screen.getAllByRole('row').slice(1)
const statusCounts = () => within(card('Runs by status')).getAllByRole('listitem').map((li) => li.textContent)
const ORIGINAL_COUNTS = ['Draft2', 'In review5', 'Awaiting approval6', 'Approved3', 'Paid6', 'On hold2']

async function goTo(user: User, page: string) {
  await user.click(nav(page))
}

describe('journey: review and approve a run', () => {
  it('flows from the Overview to the run, and every module agrees afterwards', async () => {
    const user = userEvent.setup()
    renderApp('/')
    expect(statusCounts()).toEqual(ORIGINAL_COUNTS)

    // Overview -> Kestrel Analytics · Singapore (awaiting approval, no blockers) -> approve
    await user.click(within(card('Needs attention')).getByRole('link', { name: /Kestrel Analytics · Singapore\s*Pay date 20 Oct/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Kestrel Analytics · Singapore' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Approve run' }))
    await user.click(screen.getByRole('button', { name: 'Confirm approval' }))
    expect(screen.getByRole('status')).toHaveTextContent('Run approved (simulated)')
    expect(screen.getByRole('status')).toHaveFocus()

    // Overview
    await goTo(user, 'Overview')
    expect(kpi(/Awaiting approval\s*5/)).toBeInTheDocument()
    expect(statusCounts()).toEqual(['Draft2', 'In review5', 'Awaiting approval5', 'Approved4', 'Paid6', 'On hold2'])
    expect(within(card('Recent activity')).getAllByRole('listitem')[0]).toHaveTextContent('Sofia Lindqvist approved the run Kestrel Analytics · Singapore')

    // Runs list
    await goTo(user, 'Payroll runs')
    const runRow = tableRows().find((r) => r.textContent?.includes('run-2026-10-014')) as HTMLElement
    expect(within(runRow).getByText('Approved')).toBeInTheDocument()

    // Approvals
    await goTo(user, 'Approvals')
    expect(within(card('Awaiting approval')).getAllByRole('row').slice(1)).toHaveLength(5)
    expect(within(card('Recent decisions')).getAllByRole('listitem')[0]).toHaveTextContent('Approved by Sofia Lindqvist: Kestrel Analytics · Singapore')

    // Audit
    await goTo(user, 'Audit activity')
    expect(screen.getByText('Showing 9 of 9 events')).toBeInTheDocument()
    expect(within(tableRows()[0]).getByRole('rowheader')).toHaveTextContent('Run approved')

    // Exceptions and Employees are unaffected by an approval
    await goTo(user, 'Exceptions')
    expect(screen.getByText('Showing 12 of 14 exceptions')).toBeInTheDocument()
    await goTo(user, 'Employees')
    expect(screen.getByText('Showing 1–25 of 96 employees')).toBeInTheDocument()

    // Reset puts everything back
    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))
    await goTo(user, 'Overview')
    expect(statusCounts()).toEqual(ORIGINAL_COUNTS)
    await goTo(user, 'Approvals')
    expect(within(card('Awaiting approval')).getAllByRole('row').slice(1)).toHaveLength(6)
    expect(within(card('Recent decisions')).getAllByRole('listitem')).toHaveLength(1)
    await goTo(user, 'Audit activity')
    expect(screen.getByText('Showing 8 of 8 events')).toBeInTheDocument()
  }, JOURNEY_TIMEOUT_MS)
})

describe('journey: clear a blocker, then approve', () => {
  it('resolves the critical exception on the Exceptions page and approves the run from the Approvals queue', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(kpi(/Unresolved exceptions\s*12/))
    expect(screen.getByRole('heading', { level: 1, name: 'Exceptions' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Resolve: Net pay differs/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Exception resolved (simulated).')

    await goTo(user, 'Approvals')
    const orchard = within(card('Awaiting approval')).getAllByRole('row').find((r) => r.textContent?.includes('run-2026-10-010')) as HTMLElement
    expect(within(orchard).getByText('None')).toBeInTheDocument()
    await user.click(within(orchard).getByRole('link', { name: /^Review run: Orchard Row Retail · United Kingdom/ }))
    expect(screen.getByRole('button', { name: 'Approve run' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Approve run' }))
    await user.click(screen.getByRole('button', { name: 'Confirm approval' }))
    expect(within(card('Run summary')).getByText('Approved')).toBeInTheDocument()

    await goTo(user, 'Audit activity')
    expect(tableRows().slice(0, 2).map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['Run approved', 'Exception resolved'])
    await goTo(user, 'Overview')
    expect(kpi(/Unresolved exceptions\s*11\s*2 critical/)).toBeInTheDocument()
    expect(kpi(/Awaiting approval\s*5/)).toBeInTheDocument()
  }, JOURNEY_TIMEOUT_MS)
})

describe('journey: reject, then resubmit', () => {
  it('records the reason everywhere it should appear, and a resubmitted run rejoins the queue', async () => {
    const user = userEvent.setup()
    renderApp('/approvals')

    await user.click(screen.getByRole('link', { name: /^Review run: Tidewater Health · Netherlands/ }))
    await user.click(screen.getByRole('button', { name: 'Reject run' }))
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejection' }), 'Allowances are not confirmed.')
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    expect(within(card('Run summary')).getByText('In review')).toBeInTheDocument()
    expect(within(card('Run activity')).getAllByRole('listitem')[0]).toHaveTextContent('Reason: Allowances are not confirmed.')

    await goTo(user, 'Approvals')
    expect(within(card('Awaiting approval')).getAllByRole('row').slice(1)).toHaveLength(5)
    expect(within(card('Recent decisions')).getAllByRole('listitem')[0]).toHaveTextContent('Rejected by Sofia Lindqvist: Tidewater Health · Netherlands')
    await goTo(user, 'Audit activity')
    expect(tableRows()[0]).toHaveTextContent('Reason: Allowances are not confirmed.')
    await goTo(user, 'Overview')
    expect(statusCounts()).toEqual(['Draft2', 'In review6', 'Awaiting approval5', 'Approved3', 'Paid6', 'On hold2'])

    // The rejected run is no longer in the queue; its decision links back to it. Submit it again.
    await goTo(user, 'Approvals')
    await user.click(within(card('Recent decisions')).getByRole('link', { name: 'Tidewater Health · Netherlands' }))
    await user.click(screen.getByRole('button', { name: 'Submit for approval' }))
    await goTo(user, 'Approvals')
    expect(within(card('Awaiting approval')).getAllByRole('row').slice(1)).toHaveLength(6)
    expect(within(card('Recent decisions')).getAllByRole('listitem')).toHaveLength(2)
  }, JOURNEY_TIMEOUT_MS)
})
