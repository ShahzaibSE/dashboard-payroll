import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import OverviewPage from '@/features/overview/OverviewPage'
import PayrollRunsPage from '@/features/payroll-runs/PayrollRunsPage'
import { payrollRuns } from '@/fixtures'
import PayrollStateProvider from '@/state/payroll/PayrollStateProvider'
import { createInitialState, type PayrollState } from '@/state/payroll/reducer'

// Two paid runs only: nothing awaits approval, there are no exceptions, and no activity.
const reduced: PayrollState = { runs: payrollRuns.slice(0, 2), exceptions: [], events: [] }

function renderWithState(page: React.ReactNode, state = reduced) {
  return render(
    <MemoryRouter>
      <PayrollStateProvider initialState={state}>{page}</PayrollStateProvider>
    </MemoryRouter>,
  )
}

describe('pages read the shared payroll state, not the fixtures', () => {
  it('derives the Overview figures from the provided state', () => {
    renderWithState(<OverviewPage />)
    const figures = screen.getByRole('list', { name: 'Key figures' })

    expect(within(figures).getByRole('link', { name: /Awaiting approval\s*0\s*No runs waiting/ })).toBeInTheDocument()
    expect(within(figures).getByRole('link', { name: /Unresolved exceptions\s*0/ })).toBeInTheDocument()
    expect(within(figures).getByRole('link', { name: /230 employees · 2 runs/ })).toBeInTheDocument()
  })

  it('lists only the runs in the provided state', () => {
    renderWithState(<PayrollRunsPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 2 runs')
  })

  it('shows the full fixture data by default', () => {
    renderWithState(<PayrollRunsPage />, createInitialState())

    expect(screen.getByRole('status')).toHaveTextContent('Showing 24 of 24 runs')
  })
})
