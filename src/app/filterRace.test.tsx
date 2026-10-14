import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp, renderAppWithSlowNavigation } from '@/test/renderApp'

/**
 * Every URL-driven list page must compose each filter change with the latest intended state, even when the user acts again
 * before the URL has caught up. All of these use delayed navigation so that "again" really is before the URL catches up.
 */

type Router = ReturnType<typeof renderApp>['router']
type Page = {
  name: string
  path: string
  table: string
  /** Two independent filters: [accessible label, option value]. */
  changes: [string, string][]
  /** The URL query after both changes, and how many rows should match. */
  expectedQuery: string
  expectedRows: number
  /** A third, independent change and what the query and rows are after all three. */
  third: [string, string]
  expectedQueryAfterThird: string
  expectedRowsAfterThird: number
  sort?: { button: string; expectedQuery: string }
  text?: { label: string; typed: string; expectedRows: number }
  /** A filter with a value that matches nothing, to prove an invalid URL value is dropped without losing the valid ones. */
  clear: string
}

const pages: Page[] = [
  {
    name: 'Payroll runs',
    path: '/payroll-runs',
    table: 'Payroll runs for October 2026',
    changes: [['Status', 'paid'], ['Region', 'EMEA']],
    expectedQuery: 'status=paid&region=EMEA',
    expectedRows: 1,
    third: ['Country', 'GB'],
    expectedQueryAfterThird: 'status=paid&region=EMEA&country=GB',
    expectedRowsAfterThird: 1,
    sort: { button: 'Employees', expectedQuery: 'status=paid&region=EMEA&sort=employees&dir=asc' },
    text: { label: 'Search', typed: 'quillon', expectedRows: 1 },
    clear: 'Clear filters',
  },
  {
    name: 'Exceptions',
    path: '/exceptions',
    table: 'Payroll exceptions across all runs',
    changes: [['Severity', 'critical'], ['Region', 'APAC']],
    expectedQuery: 'severity=critical&region=APAC',
    expectedRows: 2,
    third: ['Status', 'all'],
    expectedQueryAfterThird: 'status=all&severity=critical&region=APAC',
    expectedRowsAfterThird: 2,
    sort: { button: 'Raised', expectedQuery: 'severity=critical&region=APAC&sort=raised&dir=asc' },
    clear: 'Reset filters',
  },
  {
    name: 'Audit activity',
    path: '/audit',
    table: 'Audit trail, newest first',
    changes: [['Event type', 'exception.resolved'], ['Actor', 'Mei Tanaka']],
    expectedQuery: 'kind=exception.resolved&actor=Mei+Tanaka',
    expectedRows: 1,
    third: ['Run', 'run-2026-10-009'],
    expectedQueryAfterThird: 'kind=exception.resolved&run=run-2026-10-009&actor=Mei+Tanaka',
    expectedRowsAfterThird: 1,
    clear: 'Reset filters',
  },
  {
    name: 'Employees',
    path: '/employees',
    table: 'Sample directory of fictional employees',
    changes: [['Organisation', 'org-lumen'], ['Country', 'SG']],
    expectedQuery: 'org=org-lumen&country=SG',
    expectedRows: 4,
    third: ['Search', 'analyst'],
    expectedQueryAfterThird: 'q=analyst&org=org-lumen&country=SG',
    expectedRowsAfterThird: 1,
    sort: { button: 'Country', expectedQuery: 'org=org-lumen&country=SG&sort=country&dir=asc' },
    text: { label: 'Search', typed: 'payroll', expectedRows: 0 },
    clear: 'Clear filters',
  },
]

const query = (router: Router) => new URLSearchParams(router.state.location.search).toString()
const rowCount = (table: string) => within(screen.getByRole('table', { name: table })).getAllByRole('row').length - 1
const control = (label: string) => screen.getByLabelText(label)
const setControl = async (user: ReturnType<typeof userEvent.setup>, label: string, value: string) => {
  const element = control(label)
  if (element.tagName === 'SELECT') await user.selectOptions(element, value)
  else await user.type(element, value)
}

describe.each(pages)('$name', (page) => {
  it('keeps both of two filters changed one right after the other, before the URL has caught up', async () => {
    const user = userEvent.setup({ delay: null })
    const { router } = renderAppWithSlowNavigation(page.path)

    for (const [label, value] of page.changes) await setControl(user, label, value)

    // The controls show both choices straight away, and the URL and rows settle on both together.
    for (const [label, value] of page.changes) expect(control(label)).toHaveValue(value)
    await waitFor(() => expect(query(router)).toBe(page.expectedQuery))
    await waitFor(() => expect(rowCount(page.table)).toBe(page.expectedRows))
    for (const [label, value] of page.changes) expect(control(label)).toHaveValue(value)
  })

  it('composes three quick changes, never reverting an earlier one', async () => {
    const user = userEvent.setup({ delay: null })
    const { router } = renderAppWithSlowNavigation(page.path)

    for (const [label, value] of [...page.changes, page.third]) await setControl(user, label, value)

    await waitFor(() => expect(query(router)).toBe(page.expectedQueryAfterThird))
    await waitFor(() => expect(rowCount(page.table)).toBe(page.expectedRowsAfterThird))
  })

  it('clears every filter, in the URL and in the controls, even right after changing them', async () => {
    const user = userEvent.setup({ delay: null })
    const { router } = renderAppWithSlowNavigation(page.path)

    for (const [label, value] of page.changes) await setControl(user, label, value)
    await user.click(screen.getAllByRole('button', { name: page.clear }).at(-1) as HTMLElement)

    await waitFor(() => expect(query(router)).toBe(''))
    for (const [label] of page.changes) expect(control(label)).toHaveValue(label === 'Status' && page.name === 'Exceptions' ? 'unresolved' : '')
    await waitFor(() => expect(screen.getByRole('table', { name: page.table })).toBeInTheDocument())
  })

  it('follows Back and Forward to a different set of filters, then composes new changes onto it', async () => {
    const user = userEvent.setup({ delay: null })
    const { router } = renderApp(`${page.path}?${page.expectedQuery}`)
    for (const [label, value] of page.changes) expect(control(label)).toHaveValue(value)

    await act(() => router.navigate(page.path))
    for (const [label] of page.changes) expect(control(label)).not.toHaveValue(page.changes.find(([l]) => l === label)?.[1])
    await act(() => router.navigate(-1))
    for (const [label, value] of page.changes) expect(control(label)).toHaveValue(value)
    await act(() => router.navigate(1))

    // After Forward the draft follows the URL again, so a new change is composed onto the page as it now is.
    const [label, value] = page.changes[0]
    await setControl(user, label, value)
    await waitFor(() => expect(query(router)).toContain(page.expectedQuery.split('&')[0]))
    expect(query(router)).not.toContain(page.expectedQuery.split('&')[1])
  })

  if (page.sort) {
    const sort = page.sort
    it('keeps the filters when a column is sorted straight after changing them', async () => {
      const user = userEvent.setup({ delay: null })
      const { router } = renderAppWithSlowNavigation(page.path)

      for (const [label, value] of page.changes) await setControl(user, label, value)
      await user.click(within(screen.getByRole('table', { name: page.table })).getByRole('button', { name: sort.button }))

      await waitFor(() => expect(query(router)).toBe(sort.expectedQuery))
      expect(within(screen.getByRole('table', { name: page.table })).getByRole('columnheader', { name: sort.button })).toHaveAttribute('aria-sort', 'ascending')
    })

    it('toggles the direction when a column is activated twice before the URL has caught up', async () => {
      const user = userEvent.setup({ delay: null })
      const { router } = renderAppWithSlowNavigation(page.path)
      const header = () => within(screen.getByRole('table', { name: page.table })).getByRole('button', { name: sort.button })

      await user.click(header())
      await user.click(header())

      await waitFor(() => expect(query(router)).toContain('dir=desc'))
      expect(within(screen.getByRole('table', { name: page.table })).getByRole('columnheader', { name: sort.button })).toHaveAttribute('aria-sort', 'descending')
    })

    it('keeps the sort when a filter is changed straight after sorting', async () => {
      const user = userEvent.setup({ delay: null })
      const { router } = renderAppWithSlowNavigation(page.path)

      await user.click(within(screen.getByRole('table', { name: page.table })).getByRole('button', { name: sort.button }))
      const [label, value] = page.changes[0]
      await setControl(user, label, value)

      await waitFor(() => expect(query(router)).toContain('sort='))
      await waitFor(() => expect(query(router)).toContain(page.expectedQuery.split('&')[0]))
    })
  }

  if (page.text) {
    const text = page.text
    it('keeps what is typed in the search box when a filter is changed while typing, and the other way round', async () => {
      const user = userEvent.setup({ delay: null })
      const { router } = renderAppWithSlowNavigation(page.path)
      const [label, value] = page.changes[0]

      await user.type(control(text.label), text.typed)
      await setControl(user, label, value)
      expect(control(text.label)).toHaveValue(text.typed)
      expect(control(label)).toHaveValue(value)
      await waitFor(() => expect(query(router)).toContain(`q=${text.typed}`))
      await waitFor(() => expect(query(router)).toContain(page.expectedQuery.split('&')[0]))
      expect(control(text.label)).toHaveValue(text.typed)

      // And typing straight after a filter change keeps the filter.
      await user.type(control(text.label), ' ')
      await waitFor(() => expect(query(router)).toContain(page.expectedQuery.split('&')[0]))
      expect(control(label)).toHaveValue(value)
    })
  }
})
