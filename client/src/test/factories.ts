import type { Commitment, Fund } from '../api/types.ts'

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
