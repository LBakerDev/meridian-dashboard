import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { isApiError } from './client.ts'
import { api } from './endpoints.ts'
import type { ActivityListParams, ActivityType, GoalUpdate, NewGoalRequest } from './types.ts'

/**
 * Cache keys, organized so one invalidation refreshes everything related:
 * invalidating ['goals'] covers the list and every detail.
 */
export const queryKeys = {
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
    feed: (params: ActivityFeedParams) => ['activity', 'feed', params] as const,
  },
}

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

export interface ActivityFeedParams {
  type?: ActivityType
  goalId?: string
}

/** How many entries each "Show more" loads. */
export const FEED_PAGE_SIZE = 40

/**
 * The activity feed: newest first, loaded a page at a time as you ask for more.
 * A new filter keeps the current feed on screen until its results arrive.
 */
export function useActivityFeed(params: ActivityFeedParams) {
  return useInfiniteQuery({
    queryKey: queryKeys.activity.feed(params),
    queryFn: ({ signal, pageParam }) =>
      api.listActivity({ ...params, sort: 'date', order: 'desc', page: pageParam, pageSize: FEED_PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
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

/** Everything a goal disappearing (or coming back) can change. */
function refreshAfterGoalRemoval(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
    queryClient.invalidateQueries({ queryKey: queryKeys.history }),
    queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
  ])
}

/** Delete a goal that has nothing in it. Pair with useRestoreGoal for Undo. */
export function useDeleteGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteGoal(id),
    onSuccess: () => refreshAfterGoalRemoval(queryClient),
    // 409: money arrived since the page loaded; 404: already gone. Either way the list is stale.
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
  })
}

export function useRestoreGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.restoreGoal(id),
    onSuccess: () => refreshAfterGoalRemoval(queryClient),
  })
}

/** Close a funded goal: sell its investments and withdraw the value. */
export function useCloseGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.closeGoal(id),
    onSuccess: () => refreshAfterGoalRemoval(queryClient),
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
  })
}
