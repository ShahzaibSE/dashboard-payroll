import { useRef, useState } from 'react'
import { usePayrollDispatch, usePayrollState } from '@/state/payroll/context'
import { nextEventId } from '@/state/payroll/transitions'
import type { PayrollAction } from '@/state/payroll/types'

/**
 * Runs a workflow action and reports its outcome. Returns the `message` to show, a `bannerRef` for the persistent outcome
 * element, and `perform`, which dispatches, remembers the message, and moves focus to the outcome element.
 *
 * The message belongs to the audit event the action creates (its id is predictable because ids are deterministic). If that
 * event is no longer the newest, for example after a reset, the message is stale and hidden.
 * Callers should only offer actions their guards allow; the reducer refuses anything else without changing state.
 */
export function useWorkflowAction() {
  const state = usePayrollState()
  const dispatch = usePayrollDispatch()
  const [outcome, setOutcome] = useState<{ message: string; eventId: string } | null>(null)
  const bannerRef = useRef<HTMLDivElement>(null)

  const message = outcome && state.events[0]?.id === outcome.eventId ? outcome.message : ''

  function perform(action: PayrollAction, text: string) {
    setOutcome({ message: text, eventId: nextEventId(state.events) })
    dispatch(action)
    bannerRef.current?.focus()
  }

  return { message, bannerRef, perform }
}
