import { screen, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

function card(name: string) {
  return screen.getByRole('heading', { level: 2, name }).closest('section') as HTMLElement
}

describe('Overview page', () => {
  it('leads with the key operational figures, each linking to where to act', () => {
    renderApp('/')
    const figures = screen.getByRole('list', { name: 'Key figures' })

    const approvals = within(figures).getByRole('link', { name: /Awaiting approval\s*6\s*Earliest pay date 14 Oct/ })
    expect(approvals).toHaveAttribute('href', '/approvals')
    expect(within(figures).getByRole('link', { name: /Unresolved exceptions\s*12\s*3 critical · 4 high/ })).toHaveAttribute('href', '/exceptions')
    expect(within(figures).getByRole('link', { name: /Payments due in 7 days\s*7\s*\$4,959,200 gross/ })).toBeInTheDocument()
    expect(within(figures).getByRole('link', { name: /Gross payroll, October 2026\s*\$14\.4M\s*3,880 employees · 24 runs/ })).toBeInTheDocument()
  })

  it('shows what needs attention, grouped, with links to the affected run or module', () => {
    renderApp('/')
    const attention = card('Needs attention')

    expect(within(attention).getByRole('heading', { level: 3, name: /Awaiting approval \(6\)/ })).toBeInTheDocument()
    expect(within(attention).getByRole('heading', { level: 3, name: /Critical exceptions \(3\)/ })).toBeInTheDocument()
    expect(within(attention).getByRole('heading', { level: 3, name: /Runs on hold \(2\)/ })).toBeInTheDocument()
    expect(within(attention).getByRole('link', { name: /Orchard Row Retail · United Kingdom\s*Pay date 14 Oct \(in 2 days\)/ })).toHaveAttribute(
      'href',
      '/payroll-runs/run-2026-10-010',
    )
    expect(within(attention).getAllByText('Critical')).toHaveLength(3)
  })

  it('shows each status as text with its count, not by colour alone', () => {
    renderApp('/')
    const rows = within(card('Runs by status')).getAllByRole('listitem')

    expect(rows.map((row) => row.textContent)).toEqual(['Draft2', 'In review5', 'Awaiting approval6', 'Approved3', 'Paid6', 'On hold2'])
  })

  it('gives the country chart a text alternative with every value', () => {
    renderApp('/')
    const table = within(card('Gross payroll by country')).getByRole('table', { name: 'Gross payroll by country, largest first' })

    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(10)
    expect(within(rows[0]).getByRole('rowheader', { name: 'France' })).toBeInTheDocument()
    expect(within(rows[0]).getByText('$2,439,840')).toBeInTheDocument()
    expect(within(rows[6]).getByRole('rowheader', { name: 'United Arab Emirates' })).toBeInTheDocument()
  })

  it('lists recent runs in an accessible table that links to each run', () => {
    renderApp('/')
    const table = within(card('Recent payroll runs')).getByRole('table')

    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Run', 'Pay date', 'Employees', 'Gross (USD)', 'Status'])
    const first = within(table).getAllByRole('row')[1]
    expect(within(first).getByRole('link', { name: 'Lumen Foods Group' })).toHaveAttribute('href', '/payroll-runs/run-2026-10-009')
    expect(within(first).getByText('Approved')).toBeInTheDocument()
  })

  it('lists recent activity with timestamps', () => {
    renderApp('/')
    const items = within(card('Recent activity')).getAllByRole('listitem')

    expect(items).toHaveLength(6)
    expect(items[0]).toHaveTextContent('Lucas Brandt submitted the run for approval Orchard Row Retail · United Kingdom')
    expect(within(items[0]).getByText('Today, 09:41 UTC')).toHaveAttribute('datetime', '2026-10-12T09:41Z')
  })

  it('has one h1 and no detectable accessibility violations', async () => {
    const { container } = renderApp('/')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const results = await axe(container)
    expect(results.violations).toEqual([])
  })
})
