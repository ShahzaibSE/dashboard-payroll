import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

describe('routes', () => {
  it.each([
    ['/', 'Overview'],
    ['/payroll-runs', 'Payroll runs'],
    ['/payroll-runs/run-001', 'Payroll run details'],
    ['/exceptions', 'Exceptions'],
    ['/approvals', 'Approvals'],
    ['/audit', 'Audit activity'],
    ['/employees', 'Employees'],
    ['/does-not-exist', 'Page not found'],
  ])('resolves %s to a page whose h1 is "%s"', (path, heading) => {
    renderApp(path)

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })

  it('keeps the browser tab title in sync with the page', () => {
    renderApp('/payroll-runs')

    expect(document.title).toBe('Payroll runs · PayrollOps')
  })
})
