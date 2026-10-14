import { describe, expect, it } from 'vitest'
import { countries, organizations } from '@/fixtures'
import { buildExceptionList } from '@/features/exceptions/exceptionList'
import { parseExceptionListParams } from '@/features/exceptions/params'
import { createInitialState, payrollReducer } from '@/state/payroll/reducer'
import type { PayrollState } from '@/state/payroll/types'

const build = (query: string, state: PayrollState = createInitialState()) =>
  buildExceptionList({ state, organizations, countries }, parseExceptionListParams(new URLSearchParams(query)))
const ids = (query: string, state?: PayrollState) => build(query, state).rows.map((r) => r.id.slice(-3))

describe('buildExceptionList', () => {
  it('lists unresolved exceptions by severity, then oldest first, then id', () => {
    const list = build('')

    expect(list.total).toBe(14)
    expect(list.unresolved).toBe(12)
    // Critical: 001 (12 Oct), 002 (12 Oct), 011 (12 Oct). High: 006 (10 Oct), 003, 004, 012 (all 11 Oct).
    expect(list.rows.slice(0, 7).map((r) => r.id.slice(-3))).toEqual(['001', '002', '011', '006', '003', '004', '012'])
    expect(list.rows).toHaveLength(12)
  })

  it('joins the run label and region to each exception', () => {
    expect(build('').rows[0]).toMatchObject({ runId: 'run-2026-10-010', runLabel: 'Orchard Row Retail · United Kingdom', region: 'EMEA', canTake: true, canResolve: true })
    expect(build('').rows.find((r) => r.id === 'exc-003')).toMatchObject({ assignee: 'Daniel Reyes', canTake: false, canResolve: true })
  })

  it.each([
    ['status all', 'status=all', 14],
    ['status open', 'status=open', 9],
    ['status in progress', 'status=in_progress', 3],
    ['status resolved', 'status=resolved', 2],
    ['severity critical', 'severity=critical', 3],
    ['severity low (unresolved)', 'severity=low', 1],
    ['region APAC (unresolved)', 'region=APAC', 5],
    ['region EMEA (unresolved)', 'region=EMEA', 7],
  ])('filters by %s', (_label, query, count) => {
    expect(build(query).rows).toHaveLength(count)
  })

  it('requires every filter to match', () => {
    expect(ids('severity=critical&region=APAC')).toEqual(['002', '011'])
    expect(ids('severity=critical&status=resolved')).toEqual([])
    expect(ids('status=all&severity=low&region=APAC')).toEqual(['013'])
  })

  it('sorts by each column in both directions, with stable ties', () => {
    expect(ids('sort=raised&dir=asc').slice(0, 2)).toEqual(['010', '006'])
    expect(ids('sort=raised&dir=desc').slice(0, 3)).toEqual(['001', '002', '007'])
    expect(build('status=all&sort=status').rows.map((r) => r.status)[0]).toBe('open')
    expect(build('status=all&sort=status').rows.at(-1)?.status).toBe('resolved')
    expect(build('sort=run').rows[0].runLabel <= build('sort=run').rows[1].runLabel).toBe(true)
  })

  it('orders every row for run and status sorts in both directions: the primary key flips, ties stay oldest first then by id', () => {
    expect(ids('sort=run&dir=asc')).toEqual(['009', '002', '010', '006', '007', '003', '001', '012', '005', '008', '011', '004'])
    expect(ids('sort=run&dir=desc')).toEqual(['004', '011', '008', '005', '012', '003', '001', '007', '006', '010', '002', '009'])
    expect(ids('status=all&sort=status&dir=asc')).toEqual(['010', '006', '004', '005', '001', '002', '007', '009', '011', '003', '008', '012', '013', '014'])
    expect(ids('status=all&sort=status&dir=desc')).toEqual(['013', '014', '003', '008', '012', '010', '006', '004', '005', '001', '002', '007', '009', '011'])
  })

  it('offers no actions on an exception whose run is already paid, matching the reducer', () => {
    const state: PayrollState = {
      ...createInitialState(),
      exceptions: [{ id: 'exc-901', runId: 'run-2026-10-001', severity: 'low', status: 'open', title: 'Late note', raisedOn: '2026-10-12' }],
    }

    expect(build('', state).rows[0]).toMatchObject({ id: 'exc-901', canTake: false, canResolve: false })
    expect(payrollReducer(state, { type: 'exception/resolve', exceptionId: 'exc-901' })).toBe(state)
  })

  it('follows the shared workflow state: taking and resolving change what is listed', () => {
    const taken = payrollReducer(createInitialState(), { type: 'exception/take', exceptionId: 'exc-004' })
    expect(build('status=in_progress', taken).rows.map((r) => r.id)).toContain('exc-004')
    expect(build('status=open', taken).rows.map((r) => r.id)).not.toContain('exc-004')
    expect(build('', taken).rows.find((r) => r.id === 'exc-004')).toMatchObject({ assignee: 'Sofia Lindqvist', canTake: false, canResolve: true })

    const resolved = payrollReducer(taken, { type: 'exception/resolve', exceptionId: 'exc-004' })
    expect(build('', resolved).unresolved).toBe(11)
    expect(build('', resolved).rows.map((r) => r.id)).not.toContain('exc-004')
    expect(build('status=resolved', resolved).rows.find((r) => r.id === 'exc-004')).toMatchObject({ canTake: false, canResolve: false })
  })

  it('is deterministic and does not mutate state', () => {
    const state = createInitialState()
    const before = JSON.stringify(state)

    expect(ids('sort=run&dir=desc&status=all', state)).toEqual(ids('status=all&dir=desc&sort=run', state))
    expect(JSON.stringify(state)).toBe(before)
  })

  it('fails loudly on a missing run, organisation, or country', () => {
    const state = createInitialState()
    expect(() => build('', { ...state, runs: state.runs.filter((r) => r.id !== 'run-2026-10-010') })).toThrow(/Unknown run/)
    expect(() => buildExceptionList({ state, organizations: [], countries }, parseExceptionListParams(new URLSearchParams()))).toThrow(/Unknown organization/)
    expect(() => buildExceptionList({ state, organizations, countries: [] }, parseExceptionListParams(new URLSearchParams()))).toThrow(/Unknown country/)
  })
})
