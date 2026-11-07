import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeActivity, makeGoal } from '../../test/factories.ts'
import { requestedPaths, serveApi } from '../../test/fakeApi.ts'
import { jsonResponse, routeFetch } from '../../test/http.ts'
import { renderWithProviders } from '../../test/render.tsx'
import { ActivityFeed } from './ActivityFeed.tsx'

// Day headings leave off the current year: pin today to Nov 5, 2026.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 5, 9))
})
afterEach(() => {
  vi.useRealTimers()
})

const house = makeGoal()
const cushion = makeGoal({ id: 'goal_0002', name: 'Emergency cushion' })
const goals = [house, cushion]

const houseMonthly = makeActivity()
const cushionMonthly = makeActivity({ id: 'act_2', goalId: 'goal_0002', goalName: 'Emergency cushion', amount: 250 })
const fee = makeActivity({ id: 'act_3', date: '2026-10-28', type: 'fee', description: 'Quarterly management fee', goalId: null, goalName: null, amount: -9.6, recurring: undefined })
const dividend = makeActivity({ id: 'act_4', date: '2026-10-15', type: 'dividend', description: 'Dividend reinvested · Dividend Income', goalId: 'goal_0002', goalName: 'Emergency cushion', amount: 18.4, recurring: undefined })
const activity = [houseMonthly, cushionMonthly, fee, dividend]

const FIRST_PAGE = 'sort=date&order=desc&page=1&pageSize=40'
const activityRequests = (fetchMock: ReturnType<typeof serveApi>) => requestedPaths(fetchMock, '/api/activity')

/** 45 dividends on consecutive days, newest first: more than one page. */
const many = Array.from({ length: 45 }, (_, i) => {
  const date = new Date(2026, 10, 1 - i)
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return makeActivity({ id: `act_m${i}`, date: iso, type: 'dividend', recurring: undefined, amount: 10 + i })
})

describe('ActivityFeed', () => {
  it("groups activity by day, combining a day's monthly deposits into one line", async () => {
    const fetchMock = serveApi({ goals, activity })
    const { user } = renderWithProviders(<ActivityFeed />)

    expect(await screen.findByRole('heading', { level: 3, name: 'Sun, Nov 1' })).toBeInTheDocument()
    const monthly = screen.getByRole('button', { name: /Monthly deposits/ })
    expect(monthly).toHaveTextContent('2 goals · Chase ••4821')
    expect(monthly).toHaveTextContent('+$750')
    expect(monthly).toHaveAttribute('aria-expanded', 'false')
    expect(activityRequests(fetchMock)).toEqual([`/api/activity?${FIRST_PAGE}`])

    await user.click(monthly)

    expect(monthly).toHaveAttribute('aria-expanded', 'true')
    const shares = document.getElementById(monthly.getAttribute('aria-controls')!)!
    expect(within(shares).getByText('House deposit')).toBeInTheDocument()
    expect(within(shares).getByText('+$500')).toBeInTheDocument()
    expect(within(shares).getByText('Emergency cushion')).toBeInTheDocument()
    expect(within(shares).getByText('+$250')).toBeInTheDocument()
  })

  it('leads with the goal, shows dividends as gains, and fees as applying to all goals', async () => {
    serveApi({ goals, activity })
    renderWithProviders(<ActivityFeed />)

    const dividendLine = (await screen.findByText('Dividend reinvested · Dividend Income')).closest('li')!
    expect(within(dividendLine).getByText('Emergency cushion')).toBeInTheDocument()
    expect(within(dividendLine).getByText('+$18.40')).toHaveAttribute('data-type', 'dividend')

    const feeLine = screen.getByText('Quarterly management fee').closest('li')!
    expect(within(feeLine).getByText('All goals')).toBeInTheDocument()
    expect(within(feeLine).getByText('−$9.60')).toBeInTheDocument()
  })

  it('filters by type', async () => {
    const fetchMock = serveApi({ goals, activity })
    const { user } = renderWithProviders(<ActivityFeed />)
    await screen.findByRole('button', { name: /Monthly deposits/ })

    await user.click(screen.getByRole('radio', { name: 'Dividends' }))

    await waitFor(() => expect(activityRequests(fetchMock)).toContain(`/api/activity?type=dividend&${FIRST_PAGE}`))
    expect(await screen.findByText('Dividend reinvested · Dividend Income')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: /Monthly deposits/ })).not.toBeInTheDocument())
  })

  it('filters by goal, from a menu of your goals', async () => {
    const fetchMock = serveApi({ goals, activity })
    const { user } = renderWithProviders(<ActivityFeed />)
    await screen.findByRole('button', { name: /Monthly deposits/ })

    await user.click(screen.getByLabelText('Filter by goal'))
    await user.click(await screen.findByRole('option', { name: 'Emergency cushion' }))

    await waitFor(() => expect(activityRequests(fetchMock)).toContain(`/api/activity?goalId=goal_0002&${FIRST_PAGE}`))
    expect(screen.getByLabelText('Filter by goal')).toHaveValue('Emergency cushion')
  })

  it('restores the filters from the URL', async () => {
    const fetchMock = serveApi({ goals, activity })
    renderWithProviders(<ActivityFeed />, { route: '/?type=dividend&goal=goal_0002' })

    expect(await screen.findByText('Dividend reinvested · Dividend Income')).toBeInTheDocument()
    expect(activityRequests(fetchMock)[0]).toBe(`/api/activity?type=dividend&goalId=goal_0002&${FIRST_PAGE}`)
    expect(screen.getByRole('radio', { name: 'Dividends' })).toBeChecked()
  })

  it('loads more on request, and says when that is everything', async () => {
    serveApi({ goals, activity: many })
    const { user } = renderWithProviders(<ActivityFeed />)

    await screen.findByRole('heading', { level: 3, name: 'Sun, Nov 1' })
    // The 40th entry's day may continue on the next page, so it's held back.
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(39)

    await user.click(screen.getByRole('button', { name: 'Show more' }))

    expect(await screen.findByText("That's everything")).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(45)
  })

  it('offers to show everything when a filter matches nothing', async () => {
    serveApi({ goals, activity: [houseMonthly] })
    const { user } = renderWithProviders(<ActivityFeed />, { route: '/?type=fee' })

    expect(await screen.findByText('No fees yet.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all' }))
    expect(await screen.findByText('House deposit')).toBeInTheDocument()
  })

  it('offers a retry when activity fails to load', async () => {
    let attempts = 0
    routeFetch((call) => {
      if (!call.path.startsWith('/api/activity')) return jsonResponse(200, { data: goals, meta: { page: 1, pageSize: 25, total: 2, totalPages: 1 } })
      attempts += 1
      return attempts === 1
        ? jsonResponse(500, { error: 'Internal server error.' })
        : jsonResponse(200, { data: [fee], meta: { page: 1, pageSize: 40, total: 1, totalPages: 1 } })
    })
    const { user } = renderWithProviders(<ActivityFeed />)

    expect(await screen.findByText("Couldn't load activity")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Quarterly management fee')).toBeInTheDocument()
  })
})
