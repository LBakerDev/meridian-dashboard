/** Types mirror docs/openapi.json. Nullable fields are nullable there too. */

export type Currency = 'USD' | 'EUR' | (string & {})

export type FundStrategy =
  | 'Private Equity'
  | 'Venture Capital'
  | 'Growth Equity'
  | 'Private Credit'
  | 'Infrastructure'
  | 'Real Estate'
  | 'Secondaries'

export type FundStage = 'open' | 'closing_soon' | 'closed'
export type FundRegion = 'North America' | 'Europe' | 'Global'
export type CommitmentStatus = 'active' | 'pending_close'
export type SortOrder = 'asc' | 'desc'

export interface PageMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Paginated<T> {
  data: T[]
  meta: PageMeta
}

export interface PortfolioSummary {
  totalCommitted: number
  totalCalled: number
  totalDistributed: number
  totalNav: number
  unfundedCommitment: number
  netMoic: number
  netDpi: number
  activeCommitments: number
  currency: Currency
}

export interface Fund {
  id: string
  name: string
  manager: string
  strategy: FundStrategy
  region: FundRegion
  vintage: number
  stage: FundStage
  currency: Currency
  fundSize: number
  minInvestment: number
  targetIrrPct: number
  managementFeePct: number
  carryPct: number
  investmentPeriodYears: number
  fundTermYears: number
  /** ISO date, e.g. "2026-12-15" */
  closeDate: string
  summary: string
  highlights: string[]
}

export interface Commitment {
  id: string
  fundId: string
  fundName: string
  manager: string
  strategy: FundStrategy
  committed: number
  called: number
  distributed: number
  /** null until valued. Note: newly created commitments come back as 0, not null. */
  nav: number | null
  /** ISO date */
  dateCommitted: string
  status: CommitmentStatus
  netIrrPct: number | null
  netMoic: number | null
  netDpi: number | null
}

export interface CommitRequest {
  amount: number | null
  acknowledgedTerms: boolean
}

export type CommitmentSortField =
  | 'committed'
  | 'called'
  | 'distributed'
  | 'nav'
  | 'netIrrPct'
  | 'netMoic'
  | 'dateCommitted'

export interface CommitmentListParams {
  status?: CommitmentStatus
  fundId?: string
  sort?: CommitmentSortField
  order?: SortOrder
  page?: number
  pageSize?: number
}

export interface FundListParams {
  stage?: FundStage
  strategy?: FundStrategy
  region?: FundRegion
  q?: string
  sort?: keyof Fund
  order?: SortOrder
  page?: number
  pageSize?: number
}

// ---------------------------------------------------------------------------
// Goal-based investing (server/index.js). The commitment/fund types above are
// replaced by these once the UI moves over.
// ---------------------------------------------------------------------------

/** 1 (lowest) to 5 (highest). */
export type RiskLevel = 1 | 2 | 3 | 4 | 5
export type PortfolioStatus = 'open' | 'closed'
/** `scheduled`: created, first deposit not yet made. `paused`: monthly deposits stopped. */
export type GoalStatus = 'active' | 'scheduled' | 'paused'
export type ActivityType = 'deposit' | 'dividend' | 'fee'
export type ActivitySortField = 'date' | 'amount'

/** GET /summary */
export interface Overview {
  value: number
  contributed: number
  gain: number
  gainPct: number
  /** Sum of monthly amounts for goals that aren't paused. */
  monthlyTotal: number
  /** ISO date, or null when every goal is paused. */
  nextDepositDate: string | null
  goalCount: number
  currency: Currency
}

/** GET /history: one point per month, oldest first. */
export interface HistoryPoint {
  /** "2025-12" */
  month: string
  value: number
  contributed: number
}

export interface Portfolio {
  id: string
  name: string
  category: string
  risk: RiskLevel
  minMonthly: number
  feePct: number
  /** Used for projections only; not a promise. */
  assumedReturnPct: number
  status: PortfolioStatus
  description: string
}

export interface Goal {
  id: string
  name: string
  portfolioId: string
  portfolioName: string
  risk: RiskLevel
  target: number
  monthlyAmount: number
  contributed: number
  /** Note: a goal that hasn't started comes back as 0, not null. */
  value: number
  returnPct: number
  status: GoalStatus
  /** ISO date, or null while paused. */
  nextDepositDate: string | null
  createdAt: string
}

export interface Activity {
  id: string
  date: string
  type: ActivityType
  description: string
  goalId: string | null
  goalName: string | null
  /** Negative for fees. */
  amount: number
}

export interface ActivityListParams {
  type?: ActivityType
  goalId?: string
  sort?: ActivitySortField
  order?: SortOrder
  page?: number
  pageSize?: number
}

/** POST /goals. Amounts are null while the field is empty, so the server reports it. */
export interface NewGoalRequest {
  portfolioId: string
  name: string
  target: number | null
  monthlyAmount: number | null
  acknowledged: boolean
}

/** PATCH /goals/:id: only the fields being changed. */
export interface GoalUpdate {
  name?: string
  target?: number | null
  monthlyAmount?: number | null
  paused?: boolean
}

/** POST /goals/:id/deposits */
export interface DepositResult {
  goal: Goal
  activity: Activity
}
