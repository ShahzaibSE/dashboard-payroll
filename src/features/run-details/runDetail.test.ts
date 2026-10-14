import { describe, expect, it } from 'vitest'
import { countries, organizations } from '@/fixtures'
import { buildRunDetail, describeEvent } from '@/features/run-details/runDetail'
import { createInitialState, payrollReducer } from '@/state/payroll/reducer'
import type { PayrollState } from '@/state/payroll/types'

const run = (n: number) => `run-2026-10-${String(n).padStart(3, '0')}`
const detail = (id: string, state: PayrollState = createInitialState()) => buildRunDetail({ today: '2026-10-12', state, organizations, countries }, id)

describe('buildRunDetail', () => {
  it('returns null for an unknown run', () => {
    expect(detail('run-nope')).toBeNull()
  })

  it('describes the run from fixtures', () => {
    expect(detail(run(10))).toMatchObject({
      organization: 'Orchard Row Retail',
      country: 'United Kingdom',
      region: 'EMEA',
      currency: 'GBP',
      status: 'pending_approval',
      employeeCount: 318,
      grossUsd: 1_852_032,
      averageUsd: 5_824,
      payDate: '2026-10-14',
      payDateRelative: 'in 2 days',
    })
  })

  it('orders exceptions most severe first and counts unresolved criticals', () => {
    const d = detail(run(10))

    expect(d?.exceptions.map((e) => [e.id, e.severity, e.status])).toEqual([
      ['exc-001', 'critical', 'open'],
      ['exc-003', 'high', 'in_progress'],
    ])
    expect(d?.exceptions[1].assignee).toBe('Daniel Reyes')
    expect(d?.exceptions[0]).not.toHaveProperty('assignee')
    expect(d?.unresolvedCritical).toBe(1)
  })

  it('does not count a resolved critical exception', () => {
    const state = payrollReducer(createInitialState(), { type: 'exception/resolve', exceptionId: 'exc-001' })

    expect(detail(run(10), state)?.unresolvedCritical).toBe(0)
  })

  it('shows only this run\'s activity, newest first, with readable sentences', () => {
    expect(detail(run(10))?.timeline).toEqual([
      { id: 'evt-001', occurredAt: '2026-10-12T09:41', when: 'Today, 09:41 UTC', actor: 'Lucas Brandt', text: 'submitted the run for approval' },
    ])
    expect(detail(run(13))?.timeline[0]).toMatchObject({ text: 'raised a critical exception' })
    expect(detail(run(23))?.timeline[0]).toMatchObject({ text: 'placed the run on hold' })
    expect(detail(run(14))?.timeline).toEqual([])
  })

  it('reflects state changes: new events appear first and rejection carries its reason', () => {
    const state = payrollReducer(createInitialState(), { type: 'run/reject', runId: run(11), reason: 'Overtime lines need review.' })
    const d = detail(run(11), state)

    expect(d?.status).toBe('in_review')
    expect(d?.timeline[0]).toMatchObject({ actor: 'Sofia Lindqvist', text: 'rejected the run and returned it to review', reason: 'Overtime lines need review.' })
  })

  it('throws when a run points at a missing organisation or country', () => {
    expect(() => buildRunDetail({ today: '2026-10-12', state: createInitialState(), organizations: [], countries }, run(1))).toThrow(/Unknown organization/)
    expect(() => buildRunDetail({ today: '2026-10-12', state: createInitialState(), organizations, countries: [] }, run(1))).toThrow(/Unknown country/)
  })
})

describe('describeEvent', () => {
  it.each([
    ['approved the run', 'approved the run'],
    ['placed the run on hold:', 'placed the run on hold'],
    ['resolved an exception on', 'resolved an exception'],
    ['took ownership of an exception on', 'took ownership of an exception'],
    ['rejected the run and returned it to review:', 'rejected the run and returned it to review'],
  ])('turns "%s" into "%s"', (action, expected) => {
    expect(describeEvent(action)).toBe(expected)
  })
})
