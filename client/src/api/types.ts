/** Types mirror server/index.js. */

export type Currency = 'USD'
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

/** 1 (lowest) to 5 (highest). */
export type RiskLevel = 1 | 2 | 3 | 4 | 5
export type PortfolioStatus = 'open' | 'closed'
/** `scheduled`: created, first deposit not yet made. `paused`: monthly deposits stopped. */
export type GoalStatus = 'active' | 'scheduled' | 'paused'
export type ActivityType = 'deposit' | 'dividend' | 'fee' | 'withdrawal'
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
  /** Monthly deposits made on time, in a row. Pausing holds it rather than resetting it. */
  streak: number
  createdAt: string
}

export interface Activity {
  id: string
  date: string
  type: ActivityType
  description: string
  goalId: string | null
  goalName: string | null
  /** Negative for fees and withdrawals. */
  amount: number
  /** True for scheduled monthly deposits; absent otherwise. */
  recurring?: boolean
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

/** POST /goals/:id/close: the goal's investments are sold and this amount withdrawn. */
export interface CloseResult {
  amount: number
  activity: Activity
}

/** POST /goals/:id/deposits */
export interface DepositResult {
  goal: Goal
  activity: Activity
}
