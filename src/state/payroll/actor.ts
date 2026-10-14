/**
 * The single simulated operator behind every action. There is no sign-in and no role switching:
 * this name appears in audit events and exception assignments, and it is not an authorization model.
 */
export const SIMULATED_ACTOR = { name: 'Sofia Lindqvist', title: 'Payroll approver (simulated)' } as const
