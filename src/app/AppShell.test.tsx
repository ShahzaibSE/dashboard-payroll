import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

describe('AppShell', () => {
  it('lists every module in the primary navigation and marks the current page', () => {
    renderApp('/payroll-runs')
    const nav = screen.getByRole('navigation', { name: 'Primary' })

    for (const name of ['Overview', 'Payroll runs', 'Exceptions', 'Approvals', 'Audit activity', 'Employees']) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument()
    }
    expect(within(nav).getByRole('link', { name: 'Payroll runs' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
  })

  it('always tells the user that the data is simulated and local', () => {
    renderApp('/employees')

    expect(screen.getByText('Simulated – changes are local and not saved')).toBeInTheDocument()
    expect(screen.getByText(/Synthetic data as of 12 Oct 2026/)).toBeInTheDocument()
  })

  it('offers a skip link to the main content', () => {
    renderApp('/')

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('opens the menu with the button, and closes it with Escape returning focus to the button', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const button = screen.getByRole('button', { name: 'Menu' })
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('closes the menu and shows the new page after choosing a destination', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const button = screen.getByRole('button', { name: 'Menu' })
    await user.click(button)

    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Approvals' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Approvals' })).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('keeps the menu closed when browsing back and forward', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/')
    const nav = () => screen.getByRole('navigation', { name: 'Primary' })
    await user.click(within(nav()).getByRole('link', { name: 'Payroll runs' }))
    const button = screen.getByRole('button', { name: 'Menu' })
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')

    await act(() => router.navigate(-1))
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await act(() => router.navigate(1))
    expect(screen.getByRole('heading', { level: 1, name: 'Payroll runs' })).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('moves focus to the page content when the current page is chosen from the menu', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const button = screen.getByRole('button', { name: 'Menu' })
    await user.click(button)

    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Overview' }))

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('has no detectable accessibility violations with the menu open', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/exceptions')
    await user.click(screen.getByRole('button', { name: 'Menu' }))

    const results = await axe(container)
    expect(results.violations).toEqual([])
  })
})
