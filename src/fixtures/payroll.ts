import type {
  ActivityEvent,
  Country,
  ExceptionSeverity,
  ExceptionStatus,
  Organization,
  PayrollException,
  PayrollRun,
  RunStatus,
} from '@/fixtures/types'

/**
 * Synthetic data for a fictional payroll operations team. Every organisation, person and amount is invented.
 * Nothing here is random and nothing depends on the clock; see REFERENCE_DATE.
 */

export const organizations: Organization[] = [
  { id: 'org-harborvale', name: 'Harborvale Logistics' },
  { id: 'org-kestrel', name: 'Kestrel Analytics' },
  { id: 'org-lumen', name: 'Lumen Foods Group' },
  { id: 'org-orchardrow', name: 'Orchard Row Retail' },
  { id: 'org-tidewater', name: 'Tidewater Health' },
  { id: 'org-quillon', name: 'Quillon Labs' },
]

export const countries: Country[] = [
  { code: 'SG', name: 'Singapore', region: 'APAC', currency: 'SGD' },
  { code: 'AU', name: 'Australia', region: 'APAC', currency: 'AUD' },
  { code: 'IN', name: 'India', region: 'APAC', currency: 'INR' },
  { code: 'JP', name: 'Japan', region: 'APAC', currency: 'JPY' },
  { code: 'PH', name: 'Philippines', region: 'APAC', currency: 'PHP' },
  { code: 'GB', name: 'United Kingdom', region: 'EMEA', currency: 'GBP' },
  { code: 'DE', name: 'Germany', region: 'EMEA', currency: 'EUR' },
  { code: 'FR', name: 'France', region: 'EMEA', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', region: 'EMEA', currency: 'EUR' },
  { code: 'AE', name: 'United Arab Emirates', shortName: 'UAE', region: 'EMEA', currency: 'AED' },
]

/** Average monthly gross cost per employee in US dollars, by country. */
const averageMonthlyCostUsd: Record<string, number> = {
  SG: 6200,
  AU: 6800,
  IN: 1500,
  JP: 4800,
  PH: 1100,
  GB: 5600,
  DE: 5900,
  FR: 5200,
  NL: 5800,
  AE: 4900,
}

const PERIOD = 'October 2026'

// [organisation, country, pay day in October, status, employees, last updated day in October]
type RunSeed = [string, string, number, RunStatus, number, number]
const runSeeds: RunSeed[] = [
  ['org-harborvale', 'SG', 9, 'paid', 142, 9],
  ['org-kestrel', 'AU', 9, 'paid', 88, 9],
  ['org-lumen', 'PH', 5, 'paid', 410, 5],
  ['org-orchardrow', 'IN', 7, 'paid', 356, 7],
  ['org-tidewater', 'JP', 8, 'paid', 129, 8],
  ['org-quillon', 'GB', 10, 'paid', 41, 10],
  ['org-harborvale', 'AU', 14, 'approved', 76, 11],
  ['org-kestrel', 'DE', 15, 'approved', 63, 11],
  ['org-lumen', 'FR', 16, 'approved', 205, 12],
  ['org-orchardrow', 'GB', 14, 'pending_approval', 318, 12],
  ['org-tidewater', 'NL', 15, 'pending_approval', 97, 12],
  ['org-quillon', 'DE', 16, 'pending_approval', 34, 11],
  ['org-harborvale', 'IN', 17, 'pending_approval', 270, 12],
  ['org-kestrel', 'SG', 20, 'pending_approval', 52, 10],
  ['org-lumen', 'AE', 22, 'pending_approval', 119, 11],
  ['org-orchardrow', 'JP', 21, 'in_review', 164, 12],
  ['org-tidewater', 'AU', 23, 'in_review', 187, 11],
  ['org-quillon', 'NL', 24, 'in_review', 29, 10],
  ['org-harborvale', 'FR', 25, 'in_review', 233, 12],
  ['org-kestrel', 'PH', 26, 'in_review', 301, 9],
  ['org-lumen', 'SG', 28, 'draft', 74, 9],
  ['org-orchardrow', 'AE', 29, 'draft', 58, 8],
  ['org-tidewater', 'IN', 30, 'on_hold', 412, 12],
  ['org-quillon', 'FR', 28, 'on_hold', 22, 11],
]

const isoDay = (day: number) => `2026-10-${String(day).padStart(2, '0')}`
const pad = (n: number) => String(n).padStart(3, '0')

export const payrollRuns: PayrollRun[] = runSeeds.map(([organizationId, countryCode, payDay, status, employeeCount, updatedDay], index) => ({
  id: `run-2026-10-${pad(index + 1)}`,
  organizationId,
  countryCode,
  periodLabel: PERIOD,
  payDate: isoDay(payDay),
  status,
  employeeCount,
  // A small, fixed variation per run keeps the totals from looking uniform without any randomness.
  grossUsd: Math.round(employeeCount * averageMonthlyCostUsd[countryCode] * (0.96 + (index % 5) * 0.02)),
  updatedOn: isoDay(updatedDay),
}))

const runId = (n: number) => `run-2026-10-${pad(n)}`

// [run number, severity, status, title, raised day in October]
type ExceptionSeed = [number, ExceptionSeverity, ExceptionStatus, string, number]
const exceptionSeeds: ExceptionSeed[] = [
  [10, 'critical', 'open', 'Net pay differs from the approved baseline by more than 5%', 12],
  [13, 'critical', 'open', 'Bank account validation failed for 4 payees', 12],
  [10, 'high', 'in_progress', 'Missing tax identifier for 3 employees', 11],
  [11, 'high', 'open', 'Overtime above the statutory cap for 2 employees', 11],
  [12, 'medium', 'open', 'Allowance rate not confirmed for the pay period', 11],
  [15, 'high', 'open', 'Currency rate awaiting treasury confirmation', 10],
  [16, 'medium', 'open', 'Timesheets submitted after the cut-off for 6 employees', 12],
  [17, 'medium', 'in_progress', 'Possible duplicate payee on two lines', 11],
  [19, 'low', 'open', 'Cost centre code missing on 2 lines', 12],
  [20, 'medium', 'open', 'Leave balance adjustment pending', 9],
  [23, 'critical', 'open', 'Statutory filing deadline conflicts with the pay date', 12],
  [24, 'high', 'in_progress', 'Social contribution rate update not applied', 11],
  [7, 'low', 'resolved', 'Rounding difference on a bonus line', 10],
  [9, 'medium', 'resolved', 'Missing manager approval on an adjustment', 11],
]

export const exceptions: PayrollException[] = exceptionSeeds.map(([run, severity, status, title, day], index) => ({
  id: `exc-${pad(index + 1)}`,
  runId: runId(run),
  severity,
  status,
  title,
  raisedOn: isoDay(day),
}))

// Newest first. [minute-precision timestamp, actor, action, run number]
type EventSeed = [string, string, string, number]
const eventSeeds: EventSeed[] = [
  ['2026-10-12T09:41', 'Lucas Brandt', 'submitted the run for approval', 10],
  ['2026-10-12T09:12', 'Mei Tanaka', 'raised a critical exception on', 13],
  ['2026-10-12T08:55', 'Payroll engine', 'recalculated gross-to-net for', 16],
  ['2026-10-12T08:20', 'Amara Okafor', 'placed the run on hold:', 23],
  ['2026-10-11T17:48', 'Sofia Lindqvist', 'approved the run', 9],
  ['2026-10-11T16:30', 'Mei Tanaka', 'resolved an exception on', 9],
  ['2026-10-11T15:05', 'Daniel Reyes', 'moved the run to review:', 17],
  ['2026-10-10T18:02', 'Payroll engine', 'marked the run as paid:', 6],
]

export const activityEvents: ActivityEvent[] = eventSeeds.map(([occurredAt, actor, action, run], index) => ({
  id: `evt-${pad(index + 1)}`,
  occurredAt,
  actor,
  action,
  runId: runId(run),
}))
