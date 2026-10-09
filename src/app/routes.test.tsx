import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/routes'

describe('routes', () => {
  it.each([
    ['/', 'Overview'],
    ['/payroll-runs', 'Payroll runs'],
    ['/payroll-runs/run-001', 'Payroll run details'],
    ['/does-not-exist', 'Page not found'],
  ])('resolves %s to the "%s" page inside the app layout', (path, heading) => {
    const router = createMemoryRouter(routes, { initialEntries: [path] })
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { level: 1, name: 'PayrollOps' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument()
  })
})
