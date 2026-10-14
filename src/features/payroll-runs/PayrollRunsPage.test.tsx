import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

const table = () => screen.getByRole('table', { name: 'Payroll runs for October 2026' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
/**
 * Real routers apply a navigation a moment after it starts, so keystrokes can outrun the URL. jsdom hides that, so
 * these tests delay every navigation by a few milliseconds to reproduce what a fast typist sees in a browser.
 */
function renderWithSlowNavigation(path: string) {
  const result = renderApp(path)
  const navigate = result.router.navigate.bind(result.router)
  result.router.navigate = ((...args: Parameters<typeof navigate>) =>
    new Promise((resolve) => setTimeout(() => resolve(navigate(...args)), 15))) as typeof navigate
  return result
}

const search = (router: ReturnType<typeof renderApp>['router']) => router.state.location.search

describe('Payroll runs page', () => {
  it('lists all runs by pay date with the key columns', () => {
    renderApp('/payroll-runs')

    expect(screen.getByRole('heading', { level: 1, name: 'Payroll runs' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Showing 24 of 24 runs')
    expect(within(table()).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Organisation',
      'Country',
      'Pay date',
      'Employees',
      'Gross (USD)',
      'Status',
      'Updated',
    ])
    const first = bodyRows()[0]
    expect(within(first).getByRole('link', { name: 'Lumen Foods Group' })).toHaveAttribute('href', '/payroll-runs/run-2026-10-003')
    expect(within(first).getByText('Philippines')).toBeInTheDocument()
    expect(within(first).getByText('Paid')).toBeInTheDocument()
    expect(within(table()).getByRole('columnheader', { name: 'Pay date' })).toHaveAttribute('aria-sort', 'ascending')
  })

  it('filters by status through the URL, and the URL reproduces the view', async () => {
    const user = userEvent.setup()
    const { router, unmount } = renderApp('/payroll-runs')

    await user.selectOptions(screen.getByLabelText('Status'), 'On hold')

    expect(search(router)).toBe('?status=on_hold')
    expect(bodyRows()).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 24 runs')

    unmount()
    renderApp('/payroll-runs?status=on_hold')
    expect(bodyRows()).toHaveLength(2)
    expect(screen.getByLabelText('Status')).toHaveValue('on_hold')
  })

  it('combines region, country and search filters', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/payroll-runs')

    await user.selectOptions(screen.getByLabelText('Region'), 'EMEA')
    expect(screen.getByRole('status')).toHaveTextContent('Showing 11 of 24 runs')
    await user.selectOptions(screen.getByLabelText('Country'), 'Germany')
    expect(search(router)).toBe('?region=EMEA&country=DE')
    expect(bodyRows()).toHaveLength(2)
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'kestrel')

    expect(search(router)).toBe('?q=kestrel&region=EMEA&country=DE')
    expect(bodyRows()).toHaveLength(1)
    expect(within(bodyRows()[0]).getByRole('link', { name: 'Kestrel Analytics' })).toBeInTheDocument()
  })

  describe('search draft', () => {
    const q = (router: ReturnType<typeof renderApp>['router']) => new URLSearchParams(search(router)).get('q')
    const searchBox = () => screen.getByRole('searchbox', { name: 'Search' })

    it.each([
      ['quillon labs', 4],
      [' kestrel', 4],
      ['  lumen foods  ', 4],
    ])('keeps every character, in order, when "%s" is typed with no pause between keys', async (text, count) => {
      const user = userEvent.setup({ delay: null })
      const { router } = renderWithSlowNavigation('/payroll-runs')

      await user.type(searchBox(), text)
      expect(searchBox()).toHaveValue(text)

      await waitFor(() => expect(q(router)).toBe(text))
      expect(searchBox()).toHaveValue(text)
      // The URL changes before React commits the filtered rows, so observe the committed rows.
      await waitFor(() => expect(bodyRows()).toHaveLength(count))
    })

    it('handles rapid backspacing', async () => {
      const user = userEvent.setup({ delay: null })
      const { router } = renderWithSlowNavigation('/payroll-runs')

      await user.type(searchBox(), 'lumen foods{Backspace}{Backspace}{Backspace}')
      expect(searchBox()).toHaveValue('lumen fo')

      await waitFor(() => expect(q(router)).toBe('lumen fo'))
      expect(searchBox()).toHaveValue('lumen fo')
      await waitFor(() => expect(bodyRows()).toHaveLength(4))

      await user.clear(searchBox())
      await waitFor(() => expect(q(router)).toBeNull())
      await waitFor(() => expect(bodyRows()).toHaveLength(24))
    })

    it('keeps the draft when another filter changes, and keeps both in the URL', async () => {
      const user = userEvent.setup({ delay: null })
      const { router } = renderWithSlowNavigation('/payroll-runs')

      await user.type(searchBox(), ' quillon ')
      await user.selectOptions(screen.getByLabelText('Status'), 'Paid')

      await waitFor(() => expect(new URLSearchParams(search(router)).toString()).toBe('q=+quillon+&status=paid'))
      expect(searchBox()).toHaveValue(' quillon ')
      await waitFor(() => expect(bodyRows()).toHaveLength(1))
    })

    it('clears the draft and the URL together', async () => {
      const user = userEvent.setup({ delay: null })
      const { router } = renderApp('/payroll-runs')

      await user.type(searchBox(), 'zzzz')
      expect(screen.getByText('No payroll runs match these filters.')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Clear all filters' }))

      expect(searchBox()).toHaveValue('')
      expect(searchBox()).toHaveFocus()
      expect(q(router)).toBeNull()
      expect(bodyRows()).toHaveLength(24)

      await user.type(searchBox(), 'ab')
      await user.click(screen.getByRole('button', { name: 'Clear filters' }))
      expect(searchBox()).toHaveValue('')
    })

    it('follows browser Back and Forward', async () => {
      const { router } = renderApp('/payroll-runs?q=quillon')
      expect(searchBox()).toHaveValue('quillon')

      await act(() => router.navigate('/payroll-runs?q=kestrel%20analytics'))
      expect(searchBox()).toHaveValue('kestrel analytics')
      expect(bodyRows()).toHaveLength(4)

      await act(() => router.navigate(-1))
      expect(searchBox()).toHaveValue('quillon')
      expect(bodyRows()).toHaveLength(4)

      await act(() => router.navigate(1))
      expect(searchBox()).toHaveValue('kestrel analytics')
    })

    it('shows a link-driven change to the search text, such as the sidebar link back to the unfiltered list', async () => {
      const user = userEvent.setup({ delay: null })
      renderApp('/payroll-runs?q=quillon')

      await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Payroll runs' }))

      expect(searchBox()).toHaveValue('')
      expect(bodyRows()).toHaveLength(24)
    })

    it('replaces the history entry instead of adding one per keystroke', async () => {
      const user = userEvent.setup({ delay: null })
      const { router } = renderApp('/')

      await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Payroll runs' }))
      await user.type(searchBox(), 'quillon labs')
      await waitFor(() => expect(q(router)).toBe('quillon labs'))
      await act(() => router.navigate(-1))

      expect(router.state.location.pathname).toBe('/')
    })

    it('starts from the URL when the page is opened with a search', () => {
      renderApp('/payroll-runs?q=%20lumen&status=paid')

      expect(searchBox()).toHaveValue(' lumen')
      expect(bodyRows()).toHaveLength(1)
    })
  })

  it('sorts from the column headers, announces it with aria-sort, and toggles the direction', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/payroll-runs')

    await user.click(within(table()).getByRole('button', { name: 'Employees' }))
    expect(search(router)).toBe('?sort=employees&dir=asc')
    expect(within(table()).getByRole('columnheader', { name: 'Employees' })).toHaveAttribute('aria-sort', 'ascending')
    expect(within(table()).getByRole('columnheader', { name: 'Pay date' })).not.toHaveAttribute('aria-sort')

    await user.click(within(table()).getByRole('button', { name: 'Employees' }))
    expect(search(router)).toBe('?sort=employees&dir=desc')
    expect(within(table()).getByRole('columnheader', { name: 'Employees' })).toHaveAttribute('aria-sort', 'descending')
    expect(within(bodyRows()[0]).getByRole('link', { name: 'Tidewater Health' })).toBeInTheDocument()
    expect(within(bodyRows()[0]).getByText('412')).toBeInTheDocument()
  })

  it('keeps sort and filters together and returns to a clean URL on the default view', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/payroll-runs?status=paid&sort=gross&dir=desc')

    expect(bodyRows()).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(search(router)).toBe('')
    expect(bodyRows()).toHaveLength(24)
  })

  it('handles invalid URL parameters safely', () => {
    renderApp('/payroll-runs?status=%3Cscript%3E&region=EMEA&sort=nope&dir=up&country=ZZ')

    // Bad status/sort/dir/country are ignored; the valid region still applies and the page renders.
    expect(screen.getByRole('heading', { level: 1, name: 'Payroll runs' })).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toHaveValue('')
    expect(screen.getByLabelText('Region')).toHaveValue('EMEA')
    expect(screen.getByRole('status')).toHaveTextContent('Showing 11 of 24 runs')
    expect(within(table()).getByRole('columnheader', { name: 'Pay date' })).toHaveAttribute('aria-sort', 'ascending')
  })

  it('shortens an overlong search text instead of failing', () => {
    renderApp('/payroll-runs?q=' + 'x'.repeat(300))

    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('x'.repeat(80))
    expect(screen.getByText('No payroll runs match these filters.')).toBeInTheDocument()
  })

  it('shows an empty state with a way back when nothing matches', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/payroll-runs?q=zzzz')

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Showing 0 of 24 runs')
    expect(screen.getByText('No payroll runs match these filters.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }))

    expect(search(router)).toBe('')
    expect(bodyRows()).toHaveLength(24)
  })

  it('moves focus to the search box when the empty-state action removes itself', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs?q=zzzz')
    const clear = screen.getByRole('button', { name: 'Clear all filters' })

    await user.click(clear)

    expect(clear).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveFocus()
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('')
  })

  it('does not lose focus when the toolbar Clear filters button is used', async () => {
    const user = userEvent.setup()
    renderApp('/payroll-runs?status=paid')

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(screen.getByRole('button', { name: 'Clear filters' })).toHaveFocus()
  })

  it('keeps spaces in the search box as typed while still matching on the trimmed text', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/payroll-runs')
    const box = screen.getByRole('searchbox', { name: 'Search' })

    await user.type(box, ' ')
    expect(box).toHaveValue(' ')
    expect(new URLSearchParams(search(router)).get('q')).toBe(' ')
    expect(bodyRows()).toHaveLength(24)

    await user.type(box, 'quillon labs ')
    expect(box).toHaveValue(' quillon labs ')
    expect(bodyRows()).toHaveLength(4)
  })

  it('opens a run from its row', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/payroll-runs?country=GB')

    await user.click(within(bodyRows()[0]).getByRole('link', { name: 'Quillon Labs' }))

    expect(router.state.location.pathname).toBe('/payroll-runs/run-2026-10-006')
    expect(screen.getByRole('heading', { level: 1, name: 'Quillon Labs · United Kingdom' })).toBeInTheDocument()
  })

  it('is reachable from the Overview and the navigation', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/')

    await user.click(screen.getByRole('link', { name: 'View all runs' }))

    expect(router.state.location.pathname).toBe('/payroll-runs')
    expect(bodyRows()).toHaveLength(24)
  })

  it('has labelled controls and no detectable accessibility violations', async () => {
    const { container } = renderApp('/payroll-runs?status=pending_approval')

    for (const name of ['Search', 'Status', 'Region', 'Country']) expect(screen.getByLabelText(name)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Payroll runs, scrollable' })).toHaveAttribute('tabindex', '0')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const results = await axe(container)
    expect(results.violations).toEqual([])
  })
})
