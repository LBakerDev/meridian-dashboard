import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { makeCommitment, makeFund, makePage, makeSummary } from '../test/factories.ts'
import { deferred, jsonResponse, routeFetch } from '../test/http.ts'
import { createQueryWrapper } from '../test/queryWrapper.tsx'
import type { CommitmentListParams } from './types.ts'
import {
  useCommitment,
  useCommitments,
  useCommitToFund,
  useFunds,
  useSummary,
} from './queries.ts'

const created = makeCommitment({
  id: 'cm_0021',
  fundId: 'fund_northwind_iv',
  fundName: 'Northwind Buyout Fund IV',
  committed: 300_000,
  called: 0,
  distributed: 0,
  nav: 0,
  status: 'pending_close',
  netIrrPct: 0,
  netMoic: 0,
  netDpi: 0,
})

describe('read hooks', () => {
  it('useSummary loads the portfolio summary', async () => {
    const fetchMock = routeFetch(() => jsonResponse(200, makeSummary()))
    const { wrapper } = createQueryWrapper()

    const { result } = renderHook(() => useSummary(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.totalCommitted).toBe(39_500_000)
    expect(fetchMock).toHaveBeenCalledWith('/api/portfolio/summary', expect.anything())
  })

  it('useCommitments asks for the largest page plus the filters and sort', async () => {
    const fetchMock = routeFetch(() => jsonResponse(200, makePage([makeCommitment()])))
    const { wrapper } = createQueryWrapper()

    const { result } = renderHook(
      () => useCommitments({ status: 'active', sort: 'nav', order: 'desc' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/commitments?pageSize=100&status=active&sort=nav&order=desc',
      expect.anything(),
    )
  })

  it('useCommitments keeps the current rows on screen while a new sort loads', async () => {
    const byCommitted = makeCommitment({ id: 'cm_a' })
    const byNav = makeCommitment({ id: 'cm_b' })
    const navResponse = deferred<Response>()
    routeFetch(({ path }) =>
      path.includes('sort=nav') ? navResponse.promise : jsonResponse(200, makePage([byCommitted])),
    )
    const { wrapper } = createQueryWrapper()

    const { result, rerender } = renderHook((params: CommitmentListParams) => useCommitments(params), {
      wrapper,
      initialProps: { sort: 'committed' },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ sort: 'nav' })

    // The new sort is still loading, but the old rows stay instead of a skeleton.
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data?.data).toEqual([byCommitted])

    navResponse.resolve(jsonResponse(200, makePage([byNav])))
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false))
    expect(result.current.data?.data).toEqual([byNav])
  })

  it('useFunds fetches every fund, not just stage=open', async () => {
    const fetchMock = routeFetch(() => jsonResponse(200, makePage([makeFund()])))
    const { wrapper } = createQueryWrapper()

    const { result } = renderHook(() => useFunds(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith('/api/funds?pageSize=100', expect.anything())
  })

  it('useCommitment waits until there is an id to fetch', async () => {
    const fetchMock = routeFetch(() => jsonResponse(200, makeCommitment({ id: 'cm_0007' })))
    const { wrapper } = createQueryWrapper()

    const { result, rerender } = renderHook((id: string | null) => useCommitment(id), {
      wrapper,
      initialProps: null as string | null,
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()

    rerender('cm_0007')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith('/api/commitments/cm_0007', expect.anything())
  })
})

describe('useCommitToFund', () => {
  const variables = { fundId: 'fund_northwind_iv', amount: 300_000, acknowledgedTerms: true }

  it('posts the amount and acknowledgement, without the fund id in the body', async () => {
    const fetchMock = routeFetch(() => jsonResponse(201, created))
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCommitToFund(), { wrapper })

    await act(() => result.current.mutateAsync(variables))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/funds/fund_northwind_iv/commitments',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ amount: 300_000, acknowledgedTerms: true }) }),
    )
    // The hook re-renders with its result in a batch just after the mutation resolves.
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(created)
  })

  it('refreshes the summary and commitments after a successful commit, but not funds', async () => {
    routeFetch(() => jsonResponse(201, created))
    const { queryClient, wrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCommitToFund(), { wrapper })

    await act(() => result.current.mutateAsync(variables))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['summary'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['commitments'] })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['funds'] })
  })

  it('finishes only after the visible summary has refetched, so the form closes onto fresh numbers', async () => {
    let summaryRequests = 0
    routeFetch(({ method, path }) => {
      if (method === 'POST') return jsonResponse(201, created)
      if (path === '/api/portfolio/summary') {
        summaryRequests += 1
        return jsonResponse(200, makeSummary({ totalCommitted: summaryRequests === 1 ? 39_500_000 : 39_800_000 }))
      }
      return jsonResponse(404, { error: 'Unknown API route.' })
    })
    const { queryClient, wrapper } = createQueryWrapper()
    const { result } = renderHook(() => ({ summary: useSummary(), commit: useCommitToFund() }), { wrapper })
    await waitFor(() => expect(result.current.summary.data?.totalCommitted).toBe(39_500_000))

    let cachedAtResolve: number | undefined
    await act(async () => {
      await result.current.commit.mutateAsync(variables)
      cachedAtResolve = queryClient.getQueryData<{ totalCommitted: number }>(['summary'])?.totalCommitted
    })

    // The refetched summary is already in the cache the moment the commit resolves,
    // so whatever renders next (e.g. the form closing) shows the new total.
    expect(cachedAtResolve).toBe(39_800_000)
    expect(summaryRequests).toBe(2)
    await waitFor(() => expect(result.current.summary.data?.totalCommitted).toBe(39_800_000))
  })

  it('exposes field errors on a 400 and leaves the funds list alone', async () => {
    routeFetch(() =>
      jsonResponse(400, {
        error: 'Please correct the highlighted fields.',
        fields: { amount: 'Minimum commitment for this fund is $250,000.' },
      }),
    )
    const { queryClient, wrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCommitToFund(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ ...variables, amount: 1_000 }).catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      status: 400,
      fields: { amount: 'Minimum commitment for this fund is $250,000.' },
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('refreshes the funds list when the fund turns out to be closed (409)', async () => {
    routeFetch(() => jsonResponse(409, { error: 'Northwind Buyout Fund IV is closed to new commitments.' }))
    const { queryClient, wrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCommitToFund(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(variables).catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ status: 409 })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['funds'] })
  })
})
