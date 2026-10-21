import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { isApiError } from './client.ts'
import { api } from './endpoints.ts'
import type { CommitRequest, CommitmentListParams, FundListParams } from './types.ts'

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
