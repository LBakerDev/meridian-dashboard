import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { makeActivity, makeGoal, makeHistory, makeOverview, makePage, makePortfolio } from '../test/factories.ts'
import { deferred, jsonResponse, routeFetch } from '../test/http.ts'
import { createQueryWrapper } from '../test/queryWrapper.tsx'
import {
  useActivity,
  useAddMoney,
  useCloseGoal,
  useCreateGoal,
  useDeleteGoal,
  useGoals,
  useHistory,
  useOverview,
  usePortfolios,
  useRestoreGoal,
  useUpdateGoal,
} from './queries.ts'
import type { ActivityListParams } from './types.ts'

describe('goal read hooks', () => {
  it('useOverview loads the headline totals', async () => {
    const fetchMock = routeFetch(() => jsonResponse(200, makeOverview()))
    const { wrapper } = createQueryWrapper()

    const { result } = renderHook(() => useOverview(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.value).toBe(17_333)
    expect(fetchMock).toHaveBeenCalledWith('/api/summary', expect.anything())
  })

  it('useHistory, usePortfolios and useGoals hand back the rows, not the envelope', async () => {
    routeFetch(({ path }) => {
      if (path === '/api/history') return jsonResponse(200, { data: makeHistory(3) })
      if (path === '/api/portfolios') return jsonResponse(200, makePage([makePortfolio()]))
      return jsonResponse(200, makePage([makeGoal()]))
    })
    const { wrapper } = createQueryWrapper()

    const { result } = renderHook(() => ({ history: useHistory(), portfolios: usePortfolios(), goals: useGoals() }), { wrapper })

    await waitFor(() => expect(result.current.goals.isSuccess && result.current.history.isSuccess && result.current.portfolios.isSuccess).toBe(true))
    expect(result.current.history.data).toHaveLength(3)
    expect(result.current.portfolios.data?.[0].name).toBe('Core Growth')
    expect(result.current.goals.data?.[0].name).toBe('House deposit')
  })

  it('useActivity sends the filter, sort and page', async () => {
    const fetchMock = routeFetch(() => jsonResponse(200, makePage([makeActivity()])))
    const { wrapper } = createQueryWrapper()

    const { result } = renderHook(() => useActivity({ type: 'dividend', sort: 'amount', order: 'asc', page: 2, pageSize: 10 }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith('/api/activity?type=dividend&sort=amount&order=asc&page=2&pageSize=10', expect.anything())
  })

  it('useActivity keeps the current rows on screen while the next page loads', async () => {
    const pageOne = makeActivity({ id: 'act_1' })
    const pageTwo = deferred<Response>()
    routeFetch(({ path }) => (path.includes('page=2') ? pageTwo.promise : jsonResponse(200, makePage([pageOne]))))
    const { wrapper } = createQueryWrapper()

    const { result, rerender } = renderHook((params: ActivityListParams) => useActivity(params), {
      wrapper,
      initialProps: { page: 1 },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ page: 2 })

    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data?.data).toEqual([pageOne])
    pageTwo.resolve(jsonResponse(200, makePage([makeActivity({ id: 'act_2' })])))
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false))
  })
})

describe('useCreateGoal', () => {
  const body = { portfolioId: 'core-growth', name: 'Wedding', target: 15_000, monthlyAmount: 400, acknowledged: true }

  it('posts the goal and refreshes the overview and goals', async () => {
    const fetchMock = routeFetch(() => jsonResponse(201, makeGoal({ id: 'goal_0007', name: 'Wedding', status: 'scheduled' })))
    const { queryClient, wrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateGoal(), { wrapper })

    await act(() => result.current.mutateAsync(body))

    expect(fetchMock).toHaveBeenCalledWith('/api/goals', expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['overview'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['goals'] })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['portfolios'] })
  })

  it('refreshes the portfolio list when the portfolio has closed (409)', async () => {
    routeFetch(() => jsonResponse(409, { error: 'Crypto Pioneers is no longer open to new goals.' }))
    const { queryClient, wrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateGoal(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(body).catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ status: 409 })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['portfolios'] })
  })
})

describe('useUpdateGoal', () => {
  it('sends only the changed fields, without the id in the body', async () => {
    const fetchMock = routeFetch(() => jsonResponse(200, makeGoal({ status: 'paused' })))
    const { queryClient, wrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateGoal(), { wrapper })

    await act(() => result.current.mutateAsync({ id: 'goal_0001', paused: true }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/goals/goal_0001',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ paused: true }) }),
    )
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['overview'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['goals'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['activity'] })
  })

  it('exposes field errors on a 400 and refreshes nothing', async () => {
    routeFetch(() => jsonResponse(400, { error: 'Please correct the highlighted fields.', fields: { target: 'Set a target above what’s already saved ($7,140).' } }))
    const { queryClient, wrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateGoal(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: 'goal_0001', target: 100 }).catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ status: 400, fields: { target: expect.stringContaining('above') } })
    expect(invalidate).not.toHaveBeenCalled()
  })
})

describe('useAddMoney', () => {
  it('posts the amount and refreshes everything a deposit touches', async () => {
    const fetchMock = routeFetch(() => jsonResponse(201, { goal: makeGoal({ value: 7_390 }), activity: makeActivity({ amount: 250 }) }))
    const { queryClient, wrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAddMoney(), { wrapper })

    await act(() => result.current.mutateAsync({ goalId: 'goal_0001', amount: 250 }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/goals/goal_0001/deposits',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ amount: 250 }) }),
    )
    for (const key of ['overview', 'history', 'goals', 'activity']) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] })
    }
  })

  it('finishes only after the overview has refetched, so the drawer closes onto the new total', async () => {
    let overviewRequests = 0
    routeFetch(({ method, path }) => {
      if (method === 'POST') return jsonResponse(201, { goal: makeGoal(), activity: makeActivity() })
      if (path === '/api/summary') {
        overviewRequests += 1
        return jsonResponse(200, makeOverview({ value: overviewRequests === 1 ? 17_333 : 17_583 }))
      }
      return jsonResponse(404, { error: 'Endpoint not found.' })
    })
    const { queryClient, wrapper } = createQueryWrapper()
    const { result } = renderHook(() => ({ overview: useOverview(), addMoney: useAddMoney() }), { wrapper })
    await waitFor(() => expect(result.current.overview.data?.value).toBe(17_333))

    let cachedAtResolve: number | undefined
    await act(async () => {
      await result.current.addMoney.mutateAsync({ goalId: 'goal_0001', amount: 250 })
      cachedAtResolve = queryClient.getQueryData<{ value: number }>(['overview'])?.value
    })

    expect(cachedAtResolve).toBe(17_583)
  })

  it('refreshes the goals when the goal is gone (404)', async () => {
    routeFetch(() => jsonResponse(404, { error: 'Goal not found.' }))
    const { queryClient, wrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAddMoney(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ goalId: 'goal_9999', amount: 50 }).catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['goals'] })
  })
})

describe('removing goals', () => {
  const everything = ['overview', 'history', 'goals', 'activity']

  it('useDeleteGoal sends DELETE and refreshes everything a goal touches', async () => {
    const fetchMock = routeFetch(() => new Response(null, { status: 204 }))
    const { queryClient, wrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteGoal(), { wrapper })

    await act(() => result.current.mutateAsync('goal_0006'))

    expect(fetchMock).toHaveBeenCalledWith('/api/goals/goal_0006', expect.objectContaining({ method: 'DELETE' }))
    for (const key of everything) expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] })
  })

  it('useDeleteGoal refreshes the goals when the server refuses (money arrived meanwhile)', async () => {
    routeFetch(() => jsonResponse(409, { error: 'Japan trip has money in it. Close it to withdraw instead.' }))
    const { queryClient, wrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteGoal(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('goal_0006').catch(() => {})
    })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['goals'] })
  })

  it('useRestoreGoal brings a deleted goal back', async () => {
    const fetchMock = routeFetch(() => jsonResponse(200, makeGoal({ id: 'goal_0006' })))
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useRestoreGoal(), { wrapper })

    await act(() => result.current.mutateAsync('goal_0006'))

    expect(fetchMock).toHaveBeenCalledWith('/api/goals/goal_0006/restore', expect.objectContaining({ method: 'POST' }))
  })

  it('useCloseGoal posts the close and returns the amount withdrawn', async () => {
    const fetchMock = routeFetch(() => jsonResponse(200, { amount: 7_140, activity: makeActivity({ type: 'withdrawal', amount: -7_140 }) }))
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCloseGoal(), { wrapper })

    let amount: number | undefined
    await act(async () => {
      amount = (await result.current.mutateAsync('goal_0001')).amount
    })

    expect(amount).toBe(7_140)
    expect(fetchMock).toHaveBeenCalledWith('/api/goals/goal_0001/close', expect.objectContaining({ method: 'POST' }))
  })
})
