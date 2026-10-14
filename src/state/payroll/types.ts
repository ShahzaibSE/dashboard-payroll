import type { ActivityEvent, PayrollException, PayrollRun } from '@/fixtures'

/** Everything the simulated workflow can change. Static reference data (organisations, countries) stays outside. */
export type PayrollState = {
  runs: PayrollRun[]
  exceptions: PayrollException[]
  events: ActivityEvent[]
}

export type PayrollAction =
  | { type: 'run/submit'; runId: string }
  | { type: 'run/approve'; runId: string }
  | { type: 'run/reject'; runId: string; reason: string }
  | { type: 'exception/take'; exceptionId: string }
  | { type: 'exception/resolve'; exceptionId: string }
  | { type: 'demo/reset' }
