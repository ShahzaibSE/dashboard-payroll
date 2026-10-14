import { activityEvents, exceptions, payrollRuns } from '@/fixtures'
import { applyAction } from '@/state/payroll/transitions'
import type { PayrollAction, PayrollState } from '@/state/payroll/types'

export type { PayrollAction, PayrollState } from '@/state/payroll/types'

export function createInitialState(): PayrollState {
  return { runs: payrollRuns, exceptions, events: activityEvents }
}

/**
 * Pure: `(state, action) => state`. A refused or unknown action returns the same state reference, so nothing
 * changes and no audit event is written. The business rules live in `transitions.ts`.
 */
export function payrollReducer(state: PayrollState, action: PayrollAction): PayrollState {
  if (action.type === 'demo/reset') return createInitialState()
  const result = applyAction(state, action)
  return result.ok ? result.state : state
}
