import { buildQuery, request } from './client.ts'
import type {
  Activity,
  ActivityListParams,
  CloseResult,
  DepositResult,
  Goal,
  GoalUpdate,
  HistoryPoint,
  NewGoalRequest,
  Overview,
  Paginated,
  Portfolio,
} from './types.ts'

/** One function per endpoint in server/index.js. Components use the hooks in queries.ts, not these. */
export const api = {
  getOverview: (signal?: AbortSignal) => request<Overview>('/summary', { signal }),

  getHistory: (signal?: AbortSignal) => request<{ data: HistoryPoint[] }>('/history', { signal }),

  listPortfolios: (signal?: AbortSignal) => request<Paginated<Portfolio>>('/portfolios', { signal }),

  listGoals: (signal?: AbortSignal) => request<Paginated<Goal>>('/goals', { signal }),

  getGoal: (id: string, signal?: AbortSignal) => request<Goal>(`/goals/${encodeURIComponent(id)}`, { signal }),

  createGoal: (body: NewGoalRequest) => request<Goal>('/goals', { method: 'POST', body }),

  updateGoal: (id: string, changes: GoalUpdate) =>
    request<Goal>(`/goals/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes }),

  addMoney: (id: string, amount: number | null) =>
    request<DepositResult>(`/goals/${encodeURIComponent(id)}/deposits`, { method: 'POST', body: { amount } }),

  /** Only for a goal with nothing in it; a funded goal is closed instead. */
  deleteGoal: (id: string) => request<null>(`/goals/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  restoreGoal: (id: string) => request<Goal>(`/goals/${encodeURIComponent(id)}/restore`, { method: 'POST' }),

  closeGoal: (id: string) => request<CloseResult>(`/goals/${encodeURIComponent(id)}/close`, { method: 'POST' }),

  listActivity: (params: ActivityListParams = {}, signal?: AbortSignal) =>
    request<Paginated<Activity>>(`/activity${buildQuery({ ...params })}`, { signal }),
}
