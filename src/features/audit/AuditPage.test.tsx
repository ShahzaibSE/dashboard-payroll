import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

const table = () => screen.getByRole('table', { name: 'Audit trail, newest first' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const count = () => screen.getByText(/^Showing \d+ of \d+ events$/)
const search = (router: ReturnType<typeof renderApp>['router']) => router.state.location.search
const nav = (name: string) => within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name })

describe('Audit activity page', () => {
  it('lists every event newest first with the key columns and run links', () => {
    renderApp('/audit')

    expect(screen.getByRole('heading', { level: 1, name: 'Audit activity' })).toBeInTheDocument()
    expect(screen.getByText(/Nothing here is saved and none of it is a real record/)).toBeInTheDocument()
    expect(count()).toHaveTextContent('Showing 8 of 8 events')
    expect(within(table()).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['When', 'Event', 'Actor', 'Run', 'Detail'])
    const rows = bodyRows()
    expect(rows).toHaveLength(8)
    expect(within(rows[0]).getByRole('rowheader')).toHaveTextContent('Run submitted')
    expect(within(rows[0]).getByText('Lucas Brandt')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Today, 09:41 UTC')).toHaveAttribute('datetime', '2026-10-12T09:41Z')
    expect(within(rows[0]).getByRole('link', { name: 'Orchard Row Retail · United Kingdom' })).toHaveAttribute('href', '/payroll-runs/run-2026-10-010')
    expect(within(rows[0]).getByText('submitted the run for approval')).toBeInTheDocument()
  })

  it('filters through the URL and the URL reproduces the view', async () => {
    const user = userEvent.setup()
    const { router, unmount } = renderApp('/audit')

    await user.selectOptions(screen.getByLabelText('Actor'), 'Mei Tanaka')
    expect(search(router)).toBe('?actor=Mei+Tanaka')
    expect(bodyRows()).toHaveLength(2)

    await user.selectOptions(screen.getByLabelText('Event type'), 'Exception resolved')
    expect(search(router)).toBe('?kind=exception.resolved&actor=Mei+Tanaka')
    expect(bodyRows()).toHaveLength(1)
    expect(count()).toHaveTextContent('Showing 1 of 8 events')

    unmount()
    renderApp('/audit?kind=exception.resolved&actor=Mei+Tanaka')
    expect(bodyRows()).toHaveLength(1)
    expect(screen.getByLabelText('Event type')).toHaveValue('exception.resolved')
    expect(screen.getByLabelText('Actor')).toHaveValue('Mei Tanaka')
  })

  it('shows what the URL asked for only when it matches something that exists', () => {
    renderApp('/audit?kind=run.deleted&run=nope&actor=Nobody')

    expect(screen.getByLabelText('Event type')).toHaveValue('')
    expect(screen.getByLabelText('Run')).toHaveValue('')
    expect(screen.getByLabelText('Actor')).toHaveValue('')
    expect(bodyRows()).toHaveLength(8)
  })

  it('shows an empty state and puts focus back in the filters when it is reset', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/audit?kind=run.approved&actor=Mei+Tanaka')

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('No audit events match these filters.')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Reset filters' }).at(-1) as HTMLElement)

    expect(search(router)).toBe('')
    expect(screen.getByLabelText('Event type')).toHaveFocus()
    expect(bodyRows()).toHaveLength(8)
  })

  it('records what happens in the workflow, with reasons, and Reset clears it', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-011')
    await user.click(screen.getByRole('button', { name: 'Reject run' }))
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejection' }), 'Allowances are not confirmed.')
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    await user.click(screen.getByRole('button', { name: 'Submit for approval' }))
    await user.click(nav('Audit activity'))

    expect(count()).toHaveTextContent('Showing 10 of 10 events')
    const rows = bodyRows()
    expect(within(rows[0]).getByRole('rowheader')).toHaveTextContent('Run submitted')
    expect(within(rows[0]).getByText('Today, 09:43 UTC')).toBeInTheDocument()
    expect(within(rows[1]).getByRole('rowheader')).toHaveTextContent('Run rejected')
    expect(within(rows[1]).getByText('Reason: Allowances are not confirmed.')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Sofia Lindqvist')).toBeInTheDocument()
    // The run that now appears in the trail can be used as a filter.
    await user.selectOptions(screen.getByLabelText('Run'), 'Tidewater Health · Netherlands')
    expect(bodyRows()).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))
    expect(screen.getByLabelText('Run')).toHaveValue('')
    expect(count()).toHaveTextContent('Showing 8 of 8 events')
  })

  it('shows an approval, an exception being taken, and its resolution, each once, in order', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs/run-2026-10-011')
    await user.click(screen.getByRole('button', { name: /^Take ownership: Overtime above/ }))
    await user.click(screen.getByRole('button', { name: /^Resolve: Overtime above/ }))
    await user.click(screen.getByRole('button', { name: 'Approve run' }))
    await user.click(screen.getByRole('button', { name: 'Confirm approval' }))
    await user.click(nav('Audit activity'))

    expect(bodyRows().slice(0, 3).map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['Run approved', 'Exception resolved', 'Exception taken'])
    expect(count()).toHaveTextContent('Showing 11 of 11 events')
  })

  it('is reachable from the Overview, and has no detectable accessibility violations', async () => {
    const user = userEvent.setup()
    const { router, container } = renderApp('/')

    await user.click(screen.getByRole('link', { name: 'View audit activity' }))
    expect(router.state.location.pathname).toBe('/audit')
    for (const name of ['Event type', 'Run', 'Actor']) expect(screen.getByLabelText(name)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Audit activity, scrollable' })).toHaveAttribute('tabindex', '0')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect((await axe(container)).violations).toEqual([])
  })
})
