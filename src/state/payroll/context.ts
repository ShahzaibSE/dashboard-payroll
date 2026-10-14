import { createContext, useContext, type Dispatch } from 'react'
import type { PayrollAction, PayrollState } from '@/state/payroll/reducer'

export const PayrollStateContext = createContext<PayrollState | null>(null)
export const PayrollDispatchContext = createContext<Dispatch<PayrollAction> | null>(null)

export function usePayrollState(): PayrollState {
  const state = useContext(PayrollStateContext)
  if (!state) throw new Error('usePayrollState must be used inside PayrollStateProvider')
  return state
}

export function usePayrollDispatch(): Dispatch<PayrollAction> {
  const dispatch = useContext(PayrollDispatchContext)
  if (!dispatch) throw new Error('usePayrollDispatch must be used inside PayrollStateProvider')
  return dispatch
}
