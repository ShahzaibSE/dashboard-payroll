import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import App from '@/app/App'

describe('App', () => {
  it('renders the application name as the page heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'PayrollOps' })).toBeInTheDocument()
  })

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<App />)
    const results = await axe(container)
    expect(results.violations).toEqual([])
  })
})
