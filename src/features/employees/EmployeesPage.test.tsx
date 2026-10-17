import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

const table = () => screen.getByRole('table', { name: 'Sample directory of fictional employees' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const status = () => screen.getByText(/^Showing /)
const search = (router: ReturnType<typeof renderApp>['router']) => router.state.location.search
const box = () => screen.getByRole('searchbox', { name: 'Search' })

/** Navigations land a moment after they start in a real router, so keystrokes can outrun the URL; jsdom hides that, so delay it. */
function renderWithSlowNavigation(path: string) {
  const result = renderApp(path)
  const navigate = result.router.navigate.bind(result.router)
  result.router.navigate = ((...args: Parameters<typeof navigate>) => new Promise((resolve) => setTimeout(() => resolve(navigate(...args)), 15))) as typeof navigate
  return result
}

describe('Employees page', () => {
  it('lists a fictional sample, says so, and gives no run information', () => {
    renderApp('/employees')

    expect(screen.getByRole('heading', { level: 1, name: 'Employees' })).toBeInTheDocument()
    expect(screen.getByText('Sample directory · 96 fictional employees')).toBeInTheDocument()
    expect(screen.getByText(/A fictional sample, not the full workforce/)).toBeInTheDocument()
    expect(screen.getByText(/does not say which run anyone is paid in/)).toBeInTheDocument()
    expect(status()).toHaveTextContent('Showing 1–25 of 96 employees')
    expect(within(table()).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Job title', 'Organisation', 'Country'])
    expect(bodyRows()).toHaveLength(25)
    expect(within(table()).queryByRole('link')).not.toBeInTheDocument()
    expect(within(table()).getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'ascending')
  })

  it('pages through the sample with Previous and Next, keeping focus on the button that was pressed', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/employees')
    const previous = screen.getByRole('button', { name: 'Previous' })
    const next = screen.getByRole('button', { name: 'Next' })

    expect(previous).toHaveAttribute('aria-disabled', 'true')
    await user.click(previous)
    expect(search(router)).toBe('')

    await user.click(next)
    expect(search(router)).toBe('?page=2')
    expect(status()).toHaveTextContent('Showing 26–50 of 96 employees')
    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument()
    expect(next).toHaveFocus()

    await user.click(next)
    await user.click(next)
    expect(status()).toHaveTextContent('Showing 76–96 of 96 employees')
    expect(bodyRows()).toHaveLength(21)
    expect(next).toHaveAttribute('aria-disabled', 'true')
    expect(next).toHaveFocus()
    await user.click(next)
    expect(search(router)).toBe('?page=4')

    await user.click(previous)
    expect(search(router)).toBe('?page=3')
  })

  it('starts again from page 1 whenever the filters or sort change, and the URL reproduces the view', async () => {
    const user = userEvent.setup()
    const { router, unmount } = renderApp('/employees?page=3')

    expect(status()).toHaveTextContent('Showing 51–75 of 96 employees')
    await user.selectOptions(screen.getByLabelText('Organisation'), 'Lumen Foods Group')
    expect(search(router)).toBe('?org=org-lumen')
    expect(status()).toHaveTextContent('Showing 1–16 of 16 matching employees (96 in the sample)')
    await user.selectOptions(screen.getByLabelText('Country'), 'Singapore')
    expect(search(router)).toBe('?org=org-lumen&country=SG')
    expect(bodyRows()).toHaveLength(4)

    unmount()
    renderApp('/employees?org=org-lumen&country=SG')
    expect(bodyRows()).toHaveLength(4)
    expect(screen.getByLabelText('Organisation')).toHaveValue('org-lumen')
    expect(screen.getByLabelText('Country')).toHaveValue('SG')
  })

  it('goes back to page 1 when sorting from a later page', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/employees?page=2')

    await user.click(within(table()).getByRole('button', { name: 'Country' }))

    expect(search(router)).toBe('?sort=country&dir=asc')
    expect(within(table()).getByRole('columnheader', { name: 'Country' })).toHaveAttribute('aria-sort', 'ascending')
    await user.click(within(table()).getByRole('button', { name: 'Country' }))
    expect(search(router)).toBe('?sort=country&dir=desc')
    expect(within(bodyRows()[0]).getByText('United Kingdom')).toBeInTheDocument()
  })

  it('searches by name or job title and keeps every character typed quickly, even while the URL lags', async () => {
    const user = userEvent.setup({ delay: null })
    const { router } = renderWithSlowNavigation('/employees')

    await user.type(box(), 'aiko alderwick')
    expect(box()).toHaveValue('aiko alderwick')
    await waitFor(() => expect(new URLSearchParams(search(router)).get('q')).toBe('aiko alderwick'))
    expect(box()).toHaveValue('aiko alderwick')
    await waitFor(() => expect(bodyRows()).toHaveLength(1))
    expect(within(bodyRows()[0]).getByText('Aiko Alderwick')).toBeInTheDocument()
    expect(within(bodyRows()[0]).getByText('Harborvale Logistics')).toBeInTheDocument()

    await user.clear(box())
    await user.type(box(), ' payroll analyst')
    expect(box()).toHaveValue(' payroll analyst')
    await waitFor(() => expect(bodyRows()).toHaveLength(8))
  })

  it('follows Back and Forward into the search box', async () => {
    const { router } = renderApp('/employees?q=aiko')
    expect(box()).toHaveValue('aiko')

    await act(() => router.navigate('/employees?q=marek'))
    expect(box()).toHaveValue('marek')
    await act(() => router.navigate(-1))
    expect(box()).toHaveValue('aiko')
    await act(() => router.navigate(1))
    expect(box()).toHaveValue('marek')
  })

  it('handles invalid URL parameters safely', () => {
    renderApp('/employees?page=banana&sort=nope&dir=up&org=org-nope&country=ZZ')

    expect(status()).toHaveTextContent('Showing 1–25 of 96 employees')
    expect(screen.getByLabelText('Organisation')).toHaveValue('')
    expect(screen.getByLabelText('Country')).toHaveValue('')
  })

  it('shows the last page for a page number past the end', () => {
    renderApp('/employees?page=40')

    expect(status()).toHaveTextContent('Showing 76–96 of 96 employees')
    expect(screen.getByText('Page 4 of 4')).toBeInTheDocument()
  })

  it('shows an empty state, clears the search box and URL together, and returns focus to the search box', async () => {
    const user = userEvent.setup({ delay: null })
    const { router } = renderApp('/employees')

    await user.type(box(), 'zzzz')
    expect(screen.getByText('No employees match these filters.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' }).at(-1) as HTMLElement)

    expect(box()).toHaveValue('')
    expect(box()).toHaveFocus()
    expect(search(router)).toBe('')
    expect(bodyRows()).toHaveLength(25)
  })

  it('does not depend on, or change, the payroll workflow, and Reset leaves it as it was', async () => {
    const user = userEvent.setup()
    renderApp('/employees?org=org-kestrel')
    const before = bodyRows().map((r) => r.textContent)

    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))

    expect(bodyRows().map((r) => r.textContent)).toEqual(before)
  })

  it('has labelled controls, a labelled pagination landmark, and no detectable accessibility violations', async () => {
    const { container } = renderApp('/employees')

    for (const name of ['Search', 'Organisation', 'Country']) expect(screen.getByLabelText(name)).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Employees, scrollable' })).toHaveAttribute('tabindex', '0')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect((await axe(container)).violations).toEqual([])
  })
})
