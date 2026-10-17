import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp, renderAppWithSlowNavigation } from '@/test/renderApp'

/**
 * The draft that a page works with must converge with the URL whenever something other than the page itself changes the
 * URL. React Router turns a push to the page's current URL into a REPLACE, so "a link to this page" and "an outside
 * replace" look the same to the page: a navigation it did not write.
 */

const pages = [
  { name: 'Payroll runs', path: '/payroll-runs', label: 'Status', value: 'paid', query: 'status=paid', other: ['Region', 'EMEA', 'region=EMEA'] },
  { name: 'Exceptions', path: '/exceptions', label: 'Severity', value: 'critical', query: 'severity=critical', other: ['Region', 'APAC', 'region=APAC'] },
  { name: 'Audit activity', path: '/audit', label: 'Event type', value: 'exception.resolved', query: 'kind=exception.resolved', other: ['Actor', 'Mei Tanaka', 'actor=Mei+Tanaka'] },
  { name: 'Employees', path: '/employees', label: 'Organisation', value: 'org-lumen', query: 'org=org-lumen', other: ['Country', 'SG', 'country=SG'] },
] as const

const control = (label: string) => screen.getByLabelText(label)
const query = (router: ReturnType<typeof renderApp>['router']) => new URLSearchParams(router.state.location.search).toString()

describe.each(pages)('$name URL synchronization', (page) => {
  it('follows an outside REPLACE onto different filters, then composes a new change onto them', async () => {
    const user = userEvent.setup({ delay: null })
    const { router } = renderApp(page.path)

    await act(() => router.navigate(`${page.path}?${page.query}`, { replace: true }))
    expect(control(page.label)).toHaveValue(page.value)

    await user.selectOptions(control(page.other[0]), page.other[1])
    await waitFor(() => expect(query(router)).toContain(page.other[2]))
    expect(query(router)).toContain(page.query)
  })

  it('follows a same-URL navigation (a REPLACE) issued straight after the page changed its own filter', async () => {
    const user = userEvent.setup({ delay: null })
    const { router } = renderAppWithSlowNavigation(page.path)

    await user.selectOptions(control(page.label), page.value)
    expect(control(page.label)).toHaveValue(page.value)
    // The user follows a link to the unfiltered page before the page's own change has reached the URL.
    await act(() => router.navigate(page.path, { replace: true }))

    await waitFor(() => expect(query(router)).toBe(''))
    expect(control(page.label)).not.toHaveValue(page.value)
  })

  it('still ignores its own replaces: a quick second change is not undone by the first one landing', async () => {
    const user = userEvent.setup({ delay: null })
    const { router } = renderAppWithSlowNavigation(page.path)

    await user.selectOptions(control(page.label), page.value)
    await user.selectOptions(control(page.other[0]), page.other[1])

    await waitFor(() => expect(query(router)).toContain(page.other[2]))
    expect(control(page.label)).toHaveValue(page.value)
    expect(control(page.other[0])).toHaveValue(page.other[1])
  })
})
