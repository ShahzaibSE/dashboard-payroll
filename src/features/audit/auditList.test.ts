import { describe, expect, it } from 'vitest'
import { countries, organizations } from '@/fixtures'
import { buildAuditList } from '@/features/audit/auditList'
import { parseAuditListParams } from '@/features/audit/params'
import { createInitialState, payrollReducer } from '@/state/payroll/reducer'
import type { PayrollAction, PayrollState } from '@/state/payroll/types'

const run = (n: number) => `run-2026-10-${String(n).padStart(3, '0')}`
const build = (query = '', state: PayrollState = createInitialState()) =>
  buildAuditList({ today: '2026-10-12', state, organizations, countries }, parseAuditListParams(new URLSearchParams(query)))
const ids = (query = '', state?: PayrollState) => build(query, state).rows.map((r) => r.id)
const apply = (...actions: PayrollAction[]) => actions.reduce(payrollReducer, createInitialState())

describe('buildAuditList', () => {
  it('lists every event, newest first, with run labels and readable detail', () => {
    const list = build()

    expect(list.total).toBe(8)
    expect(list.rows.map((r) => r.id)).toEqual(['evt-001', 'evt-002', 'evt-003', 'evt-004', 'evt-005', 'evt-006', 'evt-007', 'evt-008'])
    expect(list.rows[0]).toEqual({
      id: 'evt-001',
      occurredAt: '2026-10-12T09:41',
      when: 'Today, 09:41 UTC',
      actor: 'Lucas Brandt',
      kind: 'run.submitted',
      kindLabel: 'Run submitted',
      runId: run(10),
      runLabel: 'Orchard Row Retail · United Kingdom',
      detail: 'submitted the run for approval',
    })
    expect(list.rows[3]).toMatchObject({ kindLabel: 'Run put on hold', detail: 'placed the run on hold' })
    expect(list.rows[4].when).toBe('11 Oct, 17:48 UTC')
  })

  it.each([
    ['kind', 'kind=exception.resolved', ['evt-006']],
    ['run', `run=${run(9)}`, ['evt-005', 'evt-006']],
    ['actor', 'actor=Mei%20Tanaka', ['evt-002', 'evt-006']],
    ['actor with no events listed twice', 'actor=Payroll%20engine', ['evt-003', 'evt-008']],
    ['kind and actor together', 'kind=exception.raised&actor=Mei%20Tanaka', ['evt-002']],
    ['all three together', `kind=run.approved&run=${run(9)}&actor=Sofia%20Lindqvist`, ['evt-005']],
    ['filters that exclude each other', `kind=run.approved&actor=Mei%20Tanaka`, []],
  ])('filters by %s', (_label, query, expected) => {
    expect(ids(query)).toEqual(expected)
  })

  it('offers only the runs and actors that appear in the trail', () => {
    const { options } = build()

    expect(options.actors).toEqual(['Amara Okafor', 'Daniel Reyes', 'Lucas Brandt', 'Mei Tanaka', 'Payroll engine', 'Sofia Lindqvist'])
    expect(options.runs).toHaveLength(7)
    expect(options.runs.map((r) => r.label)).toEqual([...options.runs.map((r) => r.label)].sort((a, b) => a.localeCompare(b)))
    expect(options.runs.find((r) => r.id === run(14))).toBeUndefined()
  })

  it('drops filters that match nothing that exists, so the controls never disagree with the rows', () => {
    const list = build(`run=${run(14)}&actor=Nobody&kind=run.paid`)

    expect(list.effective).toEqual({ kind: 'run.paid', run: undefined, actor: undefined })
    expect(list.rows.map((r) => r.id)).toEqual(['evt-008'])
  })

  it('puts new events first and adds the run and actor to the options as actions happen', () => {
    const state = apply({ type: 'run/approve', runId: run(14) }, { type: 'run/reject', runId: run(11), reason: 'Allowances are not confirmed.' })
    const list = build('', state)

    expect(list.total).toBe(10)
    expect(list.rows.slice(0, 2).map((r) => [r.id, r.kindLabel, r.runLabel])).toEqual([
      ['evt-010', 'Run rejected', 'Tidewater Health · Netherlands'],
      ['evt-009', 'Run approved', 'Kestrel Analytics · Singapore'],
    ])
    expect(list.rows[0]).toMatchObject({ reason: 'Allowances are not confirmed.', detail: 'rejected the run and returned it to review', actor: 'Sofia Lindqvist' })
    expect(list.options.runs.map((r) => r.id)).toContain(run(14))
    expect(ids(`run=${run(14)}`, state)).toEqual(['evt-009'])
  })

  it('records an event for each kind of action, exactly once', () => {
    const state = apply(
      { type: 'run/submit', runId: run(16) },
      { type: 'exception/take', exceptionId: 'exc-004' },
      { type: 'exception/resolve', exceptionId: 'exc-004' },
      { type: 'run/approve', runId: run(10) }, // refused while a critical exception is open: no event
    )

    expect(build('', state).rows.slice(0, 3).map((r) => r.kind)).toEqual(['exception.resolved', 'exception.taken', 'run.submitted'])
    expect(build('', state).total).toBe(11)
  })

  it('fails loudly on missing references and does not mutate state', () => {
    const state = createInitialState()
    const before = JSON.stringify(state)

    expect(() => buildAuditList({ today: '2026-10-12', state, organizations: [], countries }, parseAuditListParams(new URLSearchParams()))).toThrow(/Unknown organization/)
    expect(() => buildAuditList({ today: '2026-10-12', state, organizations, countries: [] }, parseAuditListParams(new URLSearchParams()))).toThrow(/Unknown country/)
    expect(() => build('', { ...state, runs: state.runs.filter((r) => r.id !== run(6)) })).toThrow(/Unknown run/)
    expect(JSON.stringify(state)).toBe(before)
  })
})
