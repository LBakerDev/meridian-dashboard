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
