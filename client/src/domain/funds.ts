import type { Commitment, Currency, Fund } from '../api/types.ts'
import { parseDate } from './format.ts'

/** Funds closing within this many days are flagged. */
export const CLOSING_SOON_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

export function indexFunds(funds: Fund[]): Map<string, Fund> {
  return new Map(funds.map((fund) => [fund.id, fund]))
}

/**
 * Commitments carry no currency of their own, so take it from the fund.
 * Falls back to USD (the API's reporting currency) if the fund is unknown.
 */
export function currencyOf(commitment: Commitment, fundsById: Map<string, Fund>): Currency {
  return fundsById.get(commitment.fundId)?.currency ?? 'USD'
}

/** The server only rejects closed funds, so closing-soon funds accept commitments too. */
export function isCommittable(fund: Fund): boolean {
  return fund.stage !== 'closed'
}

/** Funds accepting commitments, soonest close first. */
export function committableFunds(funds: Fund[]): Fund[] {
  return funds
    .filter(isCommittable)
    .sort((a, b) => a.closeDate.localeCompare(b.closeDate) || a.name.localeCompare(b.name))
}

export type CloseStatus = 'passed' | 'today' | 'soon' | 'scheduled'

export interface CloseInfo {
  status: CloseStatus
  /** Whole days until close. Negative once the date has passed. */
  daysLeft: number
}

/**
 * Where a fund is relative to its close date. Some funds are still marked open
 * after their listed close date has passed; those come back as 'passed'.
 */
export function closeInfo(fund: Fund, today: Date = new Date()): CloseInfo {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  // Rounding absorbs the 23/25-hour days around daylight-saving changes.
  const daysLeft = Math.round((parseDate(fund.closeDate).getTime() - start.getTime()) / DAY_MS)

  if (daysLeft < 0) return { status: 'passed', daysLeft }
  if (daysLeft === 0) return { status: 'today', daysLeft }
  if (daysLeft <= CLOSING_SOON_DAYS) return { status: 'soon', daysLeft }
  return { status: 'scheduled', daysLeft }
}

export interface Holding {
  committed: number
  hasPending: boolean
}

/** What the investor already holds in each fund, for "You already hold $X here". */
export function holdingsByFund(commitments: Commitment[]): Map<string, Holding> {
  const holdings = new Map<string, Holding>()
  for (const commitment of commitments) {
    const current = holdings.get(commitment.fundId) ?? { committed: 0, hasPending: false }
    holdings.set(commitment.fundId, {
      committed: current.committed + commitment.committed,
      hasPending: current.hasPending || commitment.status === 'pending_close',
    })
  }
  return holdings
}
