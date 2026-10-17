import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { activityEvents, exceptions, payrollRuns } from '@/fixtures'
import { usePayrollDispatch, usePayrollState } from '@/state/payroll/context'
import PayrollStateProvider from '@/state/payroll/PayrollStateProvider'
import { createInitialState, payrollReducer } from '@/state/payroll/reducer'

describe('payrollReducer', () => {
  it('starts from the fixtures', () => {
    expect(createInitialState()).toEqual({ runs: payrollRuns, exceptions, events: activityEvents })
  })

  it('resets to the fixtures from any state', () => {
    const changed = { ...createInitialState(), runs: [] }

    expect(payrollReducer(changed, { type: 'demo/reset' })).toEqual(createInitialState())
  })

  it('returns the same state for an unknown action', () => {
    const state = createInitialState()

    expect(payrollReducer(state, { type: 'unknown' } as never)).toBe(state)
  })
})

function Probe() {
  const { runs } = usePayrollState()
  const dispatch = usePayrollDispatch()
  return <button onClick={() => dispatch({ type: 'demo/reset' })}>{runs.length} runs</button>
}

describe('PayrollStateProvider', () => {
  it('serves the fixture state and applies dispatched actions', async () => {
    render(
      <PayrollStateProvider initialState={{ ...createInitialState(), runs: payrollRuns.slice(0, 2) }}>
        <Probe />
      </PayrollStateProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: '2 runs' }))

    expect(screen.getByRole('button', { name: '24 runs' })).toBeInTheDocument()
  })

  it('fails loudly when used outside the provider', () => {
    expect(() => render(<Probe />)).toThrow(/PayrollStateProvider/)
  })
})
