import type { Activity, Commitment, Fund, Goal, HistoryPoint, Overview, Paginated, Portfolio, PortfolioSummary } from '../api/types.ts'

/** Test data builders. Defaults are taken from the seed data; override only what a test cares about. */

export function makeCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: 'cm_0001',
    fundId: 'fund_silverpeak_v',
    fundName: 'Silverpeak Growth Equity V',
    manager: 'Silverpeak Growth',
    strategy: 'Growth Equity',
    committed: 2_000_000,
    called: 1_400_000,
    distributed: 520_000,
    nav: 1_680_000,
    dateCommitted: '2022-09-12',
    status: 'active',
    netIrrPct: 19.4,
    netMoic: 1.57,
    netDpi: 0.37,
    ...overrides,
  }
}

export function makeSummary(overrides: Partial<PortfolioSummary> = {}): PortfolioSummary {
  return {
    totalCommitted: 39_500_000,
    totalCalled: 25_025_000,
    totalDistributed: 8_400_000,
    totalNav: 24_310_519.4,
    unfundedCommitment: 14_475_000,
    netMoic: 1.31,
    netDpi: 0.34,
    activeCommitments: 18,
    currency: 'USD',
    ...overrides,
  }
}

/** Wraps rows in the API's collection envelope. */
export function makePage<T>(data: T[]): Paginated<T> {
  return { data, meta: { page: 1, pageSize: 100, total: data.length, totalPages: 1 } }
}

export function makeFund(overrides: Partial<Fund> = {}): Fund {
  return {
    id: 'fund_northwind_iv',
    name: 'Northwind Buyout Fund IV',
    manager: 'Northwind Capital Partners',
    strategy: 'Private Equity',
    region: 'North America',
    vintage: 2025,
    stage: 'open',
    currency: 'USD',
    fundSize: 850_000_000,
    minInvestment: 250_000,
    targetIrrPct: 18,
    managementFeePct: 2,
    carryPct: 20,
    investmentPeriodYears: 5,
    fundTermYears: 10,
    closeDate: '2026-12-15',
    summary: 'Control-oriented buyouts of profitable middle-market companies.',
    highlights: [],
    ...overrides,
  }
}

// ---- Goal-based investing (defaults follow server/data.js) ----

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
