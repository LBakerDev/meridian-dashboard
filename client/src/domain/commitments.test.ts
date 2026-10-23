import { describe, expect, it } from 'vitest'
import { makeCommitment } from '../test/factories.ts'
import { calledFraction, isValued, orderByDateCommitted } from './commitments.ts'

describe('orderByDateCommitted', () => {
  const older = makeCommitment({ id: 'cm_0003', dateCommitted: '2026-02-10' })
  const today1 = makeCommitment({ id: 'cm_0021', dateCommitted: '2026-10-22' })
  const today2 = makeCommitment({ id: 'cm_0022', dateCommitted: '2026-10-22' })
  const ids = (rows: ReturnType<typeof makeCommitment>[]) => rows.map((c) => c.id)

  it("puts today's latest commitment first when newest-first, though the dates tie", () => {
    // As the API returns it: dates descending, but same-day ties in creation order.
    expect(ids(orderByDateCommitted([today1, today2, older], 'desc'))).toEqual(['cm_0022', 'cm_0021', 'cm_0003'])
  })

  it('puts the earliest first when oldest-first', () => {
    expect(ids(orderByDateCommitted([older, today2, today1], 'asc'))).toEqual(['cm_0003', 'cm_0021', 'cm_0022'])
  })

  it('compares ids as numbers, not text', () => {
    const later = makeCommitment({ id: 'cm_10000', dateCommitted: '2026-10-22' })
    expect(ids(orderByDateCommitted([later, today2], 'desc'))).toEqual(['cm_10000', 'cm_0022'])
  })
})

describe('isValued', () => {
  it('is true for an active commitment with a NAV', () => {
    expect(isValued(makeCommitment())).toBe(true)
  })

  it('is false for a pending commitment with null values', () => {
    const seededPending = makeCommitment({ status: 'pending_close', nav: null, netIrrPct: null, netMoic: null, netDpi: null })
    expect(isValued(seededPending)).toBe(false)
  })

  it('is false for a just-created commitment even though the server sent zeros', () => {
    const justCreated = makeCommitment({ status: 'pending_close', called: 0, distributed: 0, nav: 0, netIrrPct: 0, netMoic: 0, netDpi: 0 })
    expect(isValued(justCreated)).toBe(false)
  })
})

describe('calledFraction', () => {
  it('is called divided by committed', () => {
    expect(calledFraction(makeCommitment({ committed: 2_000_000, called: 1_400_000 }))).toBeCloseTo(0.7)
  })

  it('is 0 when nothing is committed, instead of dividing by zero', () => {
    expect(calledFraction(makeCommitment({ committed: 0, called: 0 }))).toBe(0)
  })
})
