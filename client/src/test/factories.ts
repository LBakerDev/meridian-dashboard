import type { Activity, Goal, HistoryPoint, Overview, Paginated, Portfolio } from '../api/types.ts'

/** Test data builders. Defaults follow server/data.js; override only what a test cares about. */

/** Wraps rows in the API's collection envelope. */
export function makePage<T>(data: T[]): Paginated<T> {
  return { data, meta: { page: 1, pageSize: 100, total: data.length, totalPages: 1 } }
}

export function makePortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    id: 'core-growth',
    name: 'Core Growth',
    category: 'Stocks',
    risk: 4,
    minMonthly: 25,
    feePct: 0.25,
    assumedReturnPct: 7,
    status: 'open',
    description: 'US and international stock index funds.',
    ...overrides,
  }
}

export function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal_0001',
    name: 'House deposit',
    portfolioId: 'core-growth',
    portfolioName: 'Core Growth',
    risk: 4,
    target: 20_000,
    monthlyAmount: 500,
    contributed: 6_000,
    value: 7_140,
    returnPct: 19,
    status: 'active',
    nextDepositDate: '2026-12-01',
    streak: 12,
    createdAt: '2025-11-01',
    ...overrides,
  }
}

export function makeOverview(overrides: Partial<Overview> = {}): Overview {
  return {
    value: 17_333,
    contributed: 15_450,
    gain: 1_883,
    gainPct: 12.2,
    monthlyTotal: 1_400,
    nextDepositDate: '2026-12-01',
    goalCount: 5,
    currency: 'USD',
    ...overrides,
  }
}

export function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act_00001',
    date: '2026-11-01',
    type: 'deposit',
    description: 'Monthly deposit from Chase ••4821',
    goalId: 'goal_0001',
    goalName: 'House deposit',
    amount: 500,
    recurring: true,
    ...overrides,
  }
}

/** `months` monthly points ending Nov 2026, value growing ahead of contributions. */
export function makeHistory(months = 12): HistoryPoint[] {
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(2026, 10 - (months - 1 - i), 1)
    const contributed = 1_000 * (i + 1)
    return { month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, contributed, value: Math.round(contributed * (1 + i * 0.01)) }
  })
}
