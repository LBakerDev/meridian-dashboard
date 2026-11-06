import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { isApiError } from './client.ts'
import { api } from './endpoints.ts'
import type { ActivityListParams, CommitRequest, CommitmentListParams, FundListParams, GoalUpdate, NewGoalRequest } from './types.ts'

/** The server caps pages at 100. Lists are small, so fetch everything we're allowed in one go. */
export const MAX_PAGE_SIZE = 100

/**
 * Cache keys, organized so one invalidation refreshes everything related:
 * invalidating ['commitments'] covers every list and every detail.
 */
export const queryKeys = {
  summary: ['summary'] as const,
  commitments: {
    all: ['commitments'] as const,
    list: (params: CommitmentListParams) => ['commitments', 'list', params] as const,
    detail: (id: string) => ['commitments', 'detail', id] as const,
  },
  funds: {
    all: ['funds'] as const,
    list: (params: FundListParams) => ['funds', 'list', params] as const,
  },

  // Goal-based investing
  overview: ['overview'] as const,
  history: ['history'] as const,
  portfolios: ['portfolios'] as const,
  goals: {
    all: ['goals'] as const,
    list: ['goals', 'list'] as const,
    detail: (id: string) => ['goals', 'detail', id] as const,
  },
  activity: {
    all: ['activity'] as const,
    list: (params: ActivityListParams) => ['activity', 'list', params] as const,
  },
}

export function useSummary() {
  return useQuery({
    queryKey: queryKeys.summary,
    queryFn: ({ signal }) => api.getSummary(signal),
  })
}

/** A filtered/sorted page of commitments. Keeps the previous rows visible while a new sort loads. */
export function useCommitments(params: CommitmentListParams) {
  const withPageSize = { pageSize: MAX_PAGE_SIZE, ...params }
  return useQuery({
    queryKey: queryKeys.commitments.list(withPageSize),
    queryFn: ({ signal }) => api.listCommitments(withPageSize, signal),
    placeholderData: keepPreviousData,
  })
}

/** Every commitment, unfiltered. Used for holdings lookups ("you already hold $X here"). */
export function useAllCommitments() {
  return useCommitments({})
}

export function useCommitment(id: string | null) {
  return useQuery({
    queryKey: queryKeys.commitments.detail(id ?? ''),
    queryFn: ({ signal }) => api.getCommitment(id!, signal),
    enabled: id !== null,
  })
}

/**
 * Every fund. Fetched unfiltered (not `stage=open`) because `closing_soon` funds
 * also accept commitments, and closed funds are needed to look up the currency
 * of existing commitments.
 */
export function useFunds(params: FundListParams = {}) {
  const withPageSize = { pageSize: MAX_PAGE_SIZE, ...params }
  return useQuery({
    queryKey: queryKeys.funds.list(withPageSize),
    queryFn: ({ signal }) => api.listFunds(withPageSize, signal),
  })
}

export interface CommitVariables extends CommitRequest {
  fundId: string
}

export function useCommitToFund() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ fundId, ...body }: CommitVariables) => api.commitToFund(fundId, body),
    // Returning the promise keeps the mutation pending until the portfolio has
    // refreshed, so the new row is already there when the form closes.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.summary }),
        queryClient.invalidateQueries({ queryKey: queryKeys.commitments.all }),
      ]),
    onError: (error) => {
      // 409 (fund closed) or 404 (fund gone): our fund list is stale.
      if (isApiError(error) && (error.status === 409 || error.status === 404)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.funds.all })
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Goal-based investing
// ---------------------------------------------------------------------------

/** Headline totals: value, gain, monthly deposits. */
export function useOverview() {
  return useQuery({ queryKey: queryKeys.overview, queryFn: ({ signal }) => api.getOverview(signal) })
}

/** Monthly value vs. contributed, oldest first, for the chart. */
export function useHistory() {
  return useQuery({
    queryKey: queryKeys.history,
    queryFn: ({ signal }) => api.getHistory(signal),
    select: (response) => response.data,
  })
}

/** Every portfolio, including closed ones (a goal may still be invested in one). */
export function usePortfolios() {
  return useQuery({
    queryKey: queryKeys.portfolios,
    queryFn: ({ signal }) => api.listPortfolios(signal),
    select: (response) => response.data,
    staleTime: 5 * 60_000, // rarely changes
  })
}

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals.list,
    queryFn: ({ signal }) => api.listGoals(signal),
    select: (response) => response.data,
  })
}

/** A page of activity. Keeps the current rows visible while a new filter, sort or page loads. */
export function useActivity(params: ActivityListParams) {
  return useQuery({
    queryKey: queryKeys.activity.list(params),
    queryFn: ({ signal }) => api.listActivity(params, signal),
    placeholderData: keepPreviousData,
  })
}

/** 404: the goal or portfolio is gone, so the lists we hold are stale. */
const isGone = (error: unknown) => isApiError(error) && error.status === 404

export function useCreateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: NewGoalRequest) => api.createGoal(body),
    // Resolve only once the page has the new goal, so the drawer closes onto it.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
      ]),
    onError: (error) => {
      // 409: the portfolio closed; 404: it's gone. Either way our list is stale.
      if (isApiError(error) && (error.status === 409 || error.status === 404)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.portfolios })
      }
    },
  })
}

export interface UpdateGoalVariables extends GoalUpdate {
  id: string
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...changes }: UpdateGoalVariables) => api.updateGoal(id, changes),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.overview }), // monthly total may change
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }), // a rename shows in activity
      ]),
    onError: (error) => {
      if (isGone(error)) void queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}

export interface AddMoneyVariables {
  goalId: string
  amount: number | null
}

export function useAddMoney() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, amount }: AddMoneyVariables) => api.addMoney(goalId, amount),
    // A deposit touches everything on the page: totals, chart, the goal, activity.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
        queryClient.invalidateQueries({ queryKey: queryKeys.history }),
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
      ]),
    onError: (error) => {
      if (isGone(error)) void queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}
