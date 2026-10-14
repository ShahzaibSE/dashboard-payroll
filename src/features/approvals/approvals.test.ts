import { describe, expect, it } from 'vitest'
import { countries, organizations } from '@/fixtures'
import { buildApprovals } from '@/features/approvals/approvals'
import { createInitialState, payrollReducer } from '@/state/payroll/reducer'
import type { PayrollAction, PayrollState } from '@/state/payroll/types'

const build = (state: PayrollState = createInitialState()) => buildApprovals({ today: '2026-10-12', state, organizations, countries })
const run = (n: number) => `run-2026-10-${String(n).padStart(3, '0')}`
const apply = (...actions: PayrollAction[]) => actions.reduce(payrollReducer, createInitialState())

describe('buildApprovals', () => {
  it('queues the runs awaiting approval by pay date, with their blockers', () => {
    const { queue } = build()

    expect(queue.map((q) => q.id.slice(-3))).toEqual(['010', '011', '012', '013', '014', '015'])
    expect(queue[0]).toEqual({
      id: run(10),
      runLabel: 'Orchard Row Retail · United Kingdom',
      payDate: '2026-10-14',
      payDateRelative: 'in 2 days',
      employeeCount: 318,
      grossUsd: 1_852_032,
      blockers: 1,
    })
    expect(queue.map((q) => q.blockers)).toEqual([1, 0, 0, 1, 0, 0])
  })

  it('lists the decisions already recorded, newest first', () => {
    expect(build().decisions).toEqual([
      {
        id: 'evt-005',
        occurredAt: '2026-10-11T17:48',
        when: '11 Oct, 17:48 UTC',
        actor: 'Sofia Lindqvist',
        outcome: 'Approved',
        runId: run(9),
        runLabel: 'Lumen Foods Group · France',
      },
    ])
  })

  it('moves an approved run out of the queue and into the decisions', () => {
    const { queue, decisions } = build(apply({ type: 'run/approve', runId: run(14) }))

    expect(queue.map((q) => q.id)).not.toContain(run(14))
    expect(queue).toHaveLength(5)
    expect(decisions[0]).toMatchObject({ outcome: 'Approved', runId: run(14), runLabel: 'Kestrel Analytics · Singapore', actor: 'Sofia Lindqvist', when: 'Today, 09:42 UTC' })
    expect(decisions).toHaveLength(2)
  })

  it('records a rejection with its reason and takes the run out of the queue', () => {
    const { queue, decisions } = build(apply({ type: 'run/reject', runId: run(11), reason: 'Allowances are not confirmed.' }))

    expect(queue.map((q) => q.id)).not.toContain(run(11))
    expect(decisions[0]).toMatchObject({ outcome: 'Rejected', runId: run(11), reason: 'Allowances are not confirmed.' })
  })

  it('puts a resubmitted run back in the queue and keeps the earlier rejection', () => {
    const state = apply({ type: 'run/reject', runId: run(11), reason: 'Allowances are not confirmed.' }, { type: 'run/submit', runId: run(11) })
    const { queue, decisions } = build(state)

    expect(queue.map((q) => q.id)).toContain(run(11))
    expect(decisions.map((d) => d.outcome)).toEqual(['Rejected', 'Approved'])
  })

  it('removes the blocker count when the critical exception is resolved', () => {
    const { queue } = build(apply({ type: 'exception/resolve', exceptionId: 'exc-001' }))

    expect(queue.find((q) => q.id === run(10))?.blockers).toBe(0)
    expect(queue.find((q) => q.id === run(13))?.blockers).toBe(1)
  })

  it('ignores other kinds of audit events', () => {
    const state = apply({ type: 'run/submit', runId: run(16) }, { type: 'exception/take', exceptionId: 'exc-004' })

    expect(build(state).decisions).toHaveLength(1)
  })

  it('is empty when nothing awaits approval and nothing was decided', () => {
    const state: PayrollState = { ...createInitialState(), runs: createInitialState().runs.filter((r) => r.status !== 'pending_approval'), events: [] }

    expect(build(state)).toEqual({ queue: [], decisions: [] })
  })

  it('fails loudly on missing references', () => {
    const state = createInitialState()

    expect(() => buildApprovals({ today: '2026-10-12', state, organizations: [], countries })).toThrow(/Unknown organization/)
    expect(() => buildApprovals({ today: '2026-10-12', state, organizations, countries: [] })).toThrow(/Unknown country/)
    expect(() => build({ ...state, runs: state.runs.filter((r) => r.id !== run(9)) })).toThrow(/Unknown run/)
  })
})
