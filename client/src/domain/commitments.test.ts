import { describe, expect, it } from 'vitest'
import { makeCommitment } from '../test/factories.ts'
import { calledFraction, isValued } from './commitments.ts'

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
