import { useReducer, type ReactNode } from 'react'
import { PayrollDispatchContext, PayrollStateContext } from '@/state/payroll/context'
import { createInitialState, payrollReducer, type PayrollState } from '@/state/payroll/reducer'

type PayrollStateProviderProps = { children: ReactNode; initialState?: PayrollState }

/** Owns the simulated payroll state for the whole app. State and dispatch are separate contexts so dispatch-only consumers never rerender. */
export default function PayrollStateProvider({ children, initialState }: PayrollStateProviderProps) {
  const [state, dispatch] = useReducer(payrollReducer, initialState, (seed) => seed ?? createInitialState())
  return (
    <PayrollDispatchContext value={dispatch}>
      <PayrollStateContext value={state}>{children}</PayrollStateContext>
    </PayrollDispatchContext>
  )
}
