import { describe, expect, it } from 'vitest'
import { makeCommitment, makeFund } from '../test/factories.ts'
import {
  closeInfo,
  committableFunds,
  currencyOf,
  holdingsByFund,
  inPickingOrder,
  indexFunds,
  isCommittable,
} from './funds.ts'

describe('inPickingOrder', () => {
  const today = new Date(2026, 9, 22)
  const passed = makeFund({ id: 'passed', name: 'Passed', closeDate: '2026-09-30' })
  const soon = makeFund({ id: 'soon', name: 'Soon', closeDate: '2026-10-31' })
  const later = makeFund({ id: 'later', name: 'Later', closeDate: '2026-12-15' })
  const closed = makeFund({ id: 'closed', name: 'Closed', stage: 'closed', closeDate: '2026-01-01' })

  it('lists soonest close first, with funds past their close date last', () => {
    const order = inPickingOrder([later, closed, passed, soon], today).map((fund) => fund.id)
    expect(order).toEqual(['soon', 'later', 'passed'])
  })
})

const usdFund = makeFund({ id: 'fund_usd', currency: 'USD' })
const eurFund = makeFund({ id: 'fund_eur', currency: 'EUR' })
const fundsById = indexFunds([usdFund, eurFund])

describe('currencyOf', () => {
  it("takes the currency from the commitment's fund", () => {
    expect(currencyOf(makeCommitment({ fundId: 'fund_eur' }), fundsById)).toBe('EUR')
  })

  it('falls back to USD when the fund is unknown', () => {
    expect(currencyOf(makeCommitment({ fundId: 'fund_missing' }), fundsById)).toBe('USD')
  })
})

describe('committable funds', () => {
  const open = makeFund({ id: 'a', name: 'Open', stage: 'open', closeDate: '2027-03-01' })
  const closingSoon = makeFund({ id: 'b', name: 'Closing soon', stage: 'closing_soon', closeDate: '2026-10-31' })
  const closed = makeFund({ id: 'c', name: 'Closed', stage: 'closed', closeDate: '2023-06-30' })

  it('accepts open and closing-soon funds, but not closed ones', () => {
    expect(isCommittable(open)).toBe(true)
    expect(isCommittable(closingSoon)).toBe(true)
    expect(isCommittable(closed)).toBe(false)
  })

  it('lists committable funds with the soonest close first', () => {
    expect(committableFunds([open, closed, closingSoon]).map((fund) => fund.id)).toEqual(['b', 'a'])
  })

  it('breaks close-date ties by name', () => {
    const z = makeFund({ id: 'z', name: 'Zeta', closeDate: '2027-01-31' })
    const a = makeFund({ id: 'x', name: 'Alpha', closeDate: '2027-01-31' })
    expect(committableFunds([z, a]).map((fund) => fund.name)).toEqual(['Alpha', 'Zeta'])
  })
})

describe('closeInfo', () => {
  const today = new Date(2026, 9, 21, 15, 30) // Oct 21, 2026, mid-afternoon

  it('flags a close date that has passed while the fund is still open', () => {
    expect(closeInfo(makeFund({ closeDate: '2026-09-30' }), today)).toEqual({ status: 'passed', daysLeft: -21 })
  })

  it('flags a fund closing today', () => {
    expect(closeInfo(makeFund({ closeDate: '2026-10-21' }), today)).toEqual({ status: 'today', daysLeft: 0 })
  })

  it('flags a fund closing within two weeks', () => {
    expect(closeInfo(makeFund({ closeDate: '2026-10-31' }), today)).toEqual({ status: 'soon', daysLeft: 10 })
    expect(closeInfo(makeFund({ closeDate: '2026-11-04' }), today)).toEqual({ status: 'soon', daysLeft: 14 })
  })

  it('treats anything further out as scheduled', () => {
    expect(closeInfo(makeFund({ closeDate: '2026-11-05' }), today)).toEqual({ status: 'scheduled', daysLeft: 15 })
  })
})

describe('holdingsByFund', () => {
  it('sums commitments per fund and notes pending ones', () => {
    const holdings = holdingsByFund([
      makeCommitment({ fundId: 'fund_a', committed: 1_000_000, status: 'active' }),
      makeCommitment({ fundId: 'fund_a', committed: 250_000, status: 'pending_close' }),
      makeCommitment({ fundId: 'fund_b', committed: 500_000, status: 'active' }),
    ])

    expect(holdings.get('fund_a')).toEqual({ committed: 1_250_000, hasPending: true })
    expect(holdings.get('fund_b')).toEqual({ committed: 500_000, hasPending: false })
    expect(holdings.get('fund_none')).toBeUndefined()
  })
})
