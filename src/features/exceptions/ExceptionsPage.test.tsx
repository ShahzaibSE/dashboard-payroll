import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

const table = () => screen.getByRole('table', { name: 'Payroll exceptions across all runs' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const count = () => screen.getByText(/^Showing \d+ of \d+ exceptions$/)
const search = (router: ReturnType<typeof renderApp>['router']) => router.state.location.search
const nav = (name: string) => within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name })

describe('Exceptions page', () => {
  it('lists unresolved exceptions, most severe and oldest first, with run links', () => {
    renderApp('/exceptions')

    expect(screen.getByRole('heading', { level: 1, name: 'Exceptions' })).toBeInTheDocument()
    expect(screen.getByText('12 unresolved of 14 exceptions · APAC and EMEA')).toBeInTheDocument()
    expect(count()).toHaveTextContent('Showing 12 of 14 exceptions')
    expect(within(table()).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Severity', 'Exception', 'Run', 'Status', 'Owner', 'Raised', 'Actions'])
    const rows = bodyRows()
    expect(rows).toHaveLength(12)
    expect(within(rows[0]).getByText('Critical')).toBeInTheDocument()
    expect(within(rows[0]).getByRole('rowheader')).toHaveTextContent('Net pay differs from the approved baseline by more than 5%')
    expect(within(rows[0]).getByRole('link', { name: 'Orchard Row Retail · United Kingdom' })).toHaveAttribute('href', '/payroll-runs/run-2026-10-010')
    expect(within(table()).getByRole('columnheader', { name: 'Severity' })).toHaveAttribute('aria-sort', 'ascending')
    // Resolved exceptions are hidden by default.
    expect(within(table()).queryByText('Rounding difference on a bonus line')).not.toBeInTheDocument()
  })

  it('filters through the URL and the URL reproduces the view', async () => {
    const user = userEvent.setup()
    const { router, unmount } = renderApp('/exceptions')

    await user.selectOptions(screen.getByLabelText('Status'), 'All statuses')
    expect(search(router)).toBe('?status=all')
    expect(bodyRows()).toHaveLength(14)

    await user.selectOptions(screen.getByLabelText('Severity'), 'Critical')
    await user.selectOptions(screen.getByLabelText('Region'), 'APAC')
    expect(search(router)).toBe('?status=all&severity=critical&region=APAC')
    expect(bodyRows()).toHaveLength(2)

    unmount()
    renderApp('/exceptions?status=all&severity=critical&region=APAC')
    expect(bodyRows()).toHaveLength(2)
    expect(screen.getByLabelText('Severity')).toHaveValue('critical')
    expect(screen.getByLabelText('Status')).toHaveValue('all')
  })

  it('sorts from the column headers and toggles the direction', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/exceptions')

    await user.click(within(table()).getByRole('button', { name: 'Raised' }))
    expect(search(router)).toBe('?sort=raised&dir=asc')
    expect(within(table()).getByRole('columnheader', { name: 'Raised' })).toHaveAttribute('aria-sort', 'ascending')
    expect(within(table()).getByRole('columnheader', { name: 'Severity' })).not.toHaveAttribute('aria-sort')
    expect(within(bodyRows()[0]).getByRole('rowheader')).toHaveTextContent('Leave balance adjustment pending')

    await user.click(within(table()).getByRole('button', { name: 'Raised' }))
    expect(search(router)).toBe('?sort=raised&dir=desc')
    expect(within(table()).getByRole('columnheader', { name: 'Raised' })).toHaveAttribute('aria-sort', 'descending')
  })

  it('handles invalid URL parameters safely', () => {
    renderApp('/exceptions?status=%3Cscript%3E&severity=urgent&region=EMEA&sort=nope&dir=up')

    expect(screen.getByLabelText('Status')).toHaveValue('unresolved')
    expect(screen.getByLabelText('Severity')).toHaveValue('')
    expect(screen.getByLabelText('Region')).toHaveValue('EMEA')
    expect(count()).toHaveTextContent('Showing 7 of 14 exceptions')
  })

  it('shows an empty state and puts focus back in the filters when it is reset', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/exceptions?status=resolved&severity=critical')

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('No exceptions match these filters.')).toBeInTheDocument()
    const reset = screen.getAllByRole('button', { name: 'Reset filters' }).at(-1) as HTMLElement
    await user.click(reset)

    expect(search(router)).toBe('')
    expect(screen.getByLabelText('Status')).toHaveFocus()
    expect(bodyRows()).toHaveLength(12)
  })

  it('takes ownership and resolves, announcing each outcome and keeping focus on it', async () => {
    const user = userEvent.setup()
    renderApp('/exceptions')
    const title = 'Overtime above the statutory cap for 2 employees'

    await user.click(screen.getByRole('button', { name: `Take ownership: ${title}` }))
    expect(screen.getByRole('status')).toHaveTextContent('You now own this exception (simulated).')
    expect(screen.getByRole('status')).toHaveFocus()
    const row = screen.getByRole('row', { name: new RegExp(title) })
    expect(within(row).getByText('In progress')).toBeInTheDocument()
    expect(within(row).getByText('Sofia Lindqvist')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /Take ownership/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: `Resolve: ${title}` }))
    expect(screen.getByRole('status')).toHaveTextContent('Exception resolved (simulated).')
    expect(screen.getByRole('status')).toHaveFocus()
    expect(screen.queryByRole('row', { name: new RegExp(title) })).not.toBeInTheDocument()
    expect(count()).toHaveTextContent('Showing 11 of 14 exceptions')
    expect(screen.getByText('11 unresolved of 14 exceptions · APAC and EMEA')).toBeInTheDocument()
  })

  it('updates the Overview counts when an exception is resolved here', async () => {
    const user = userEvent.setup()
    renderApp('/exceptions')

    await user.click(screen.getByRole('button', { name: /^Resolve: Net pay differs/ }))
    await user.click(nav('Overview'))

    expect(within(screen.getByRole('list', { name: 'Key figures' })).getByRole('link', { name: /Unresolved exceptions\s*11\s*2 critical · 4 high/ })).toBeInTheDocument()
    await user.click(nav('Exceptions'))
    expect(count()).toHaveTextContent('Showing 11 of 14 exceptions')
  })

  it('hides the outcome and restores the rows when Reset is used on the same page, without leaving it', async () => {
    const user = userEvent.setup()
    renderApp('/exceptions')
    const title = 'Overtime above the statutory cap for 2 employees'

    await user.click(screen.getByRole('button', { name: `Take ownership: ${title}` }))
    expect(screen.getByRole('status')).toHaveTextContent('You now own this exception (simulated).')
    expect(within(screen.getByRole('row', { name: new RegExp(title) })).getByText('In progress')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    const row = screen.getByRole('row', { name: new RegExp(title) })
    expect(within(row).getByText('Open')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: `Take ownership: ${title}` })).toBeInTheDocument()
  })

  it('unblocks approval on the run page when its critical exception is resolved here', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/payroll-runs/run-2026-10-010')
    expect(screen.getByRole('button', { name: 'Approve run' })).toBeDisabled()

    await user.click(nav('Exceptions'))
    await user.click(screen.getByRole('button', { name: /^Resolve: Net pay differs/ }))
    await user.click(screen.getAllByRole('link', { name: 'Orchard Row Retail · United Kingdom' })[0])

    expect(router.state.location.pathname).toBe('/payroll-runs/run-2026-10-010')
    expect(screen.getByRole('button', { name: 'Approve run' })).toBeEnabled()
  })

  it('has labelled controls, a scrollable focusable table region, and no detectable accessibility violations', async () => {
    const { container } = renderApp('/exceptions?status=all')

    for (const name of ['Status', 'Severity', 'Region']) expect(screen.getByLabelText(name)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Exceptions, scrollable' })).toHaveAttribute('tabindex', '0')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect((await axe(container)).violations).toEqual([])
  })
})
