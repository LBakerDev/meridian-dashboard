import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeGoal, makeOverview, makePortfolio } from '../../test/factories.ts'
import { serveApi } from '../../test/fakeApi.ts'
import { jsonResponse, routeFetch } from '../../test/http.ts'
import { renderWithProviders } from '../../test/render.tsx'
import { GoalList } from './GoalList.tsx'

// Projections depend on today: pin it to Nov 5, 2026.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 5, 9))
})
afterEach(() => {
  vi.useRealTimers()
})

const house = makeGoal() // $7,140 of $20,000, $500/mo, +19%
const climate = makeGoal({ id: 'goal_0004', name: 'Climate bet', portfolioId: 'clean-energy', portfolioName: 'Clean Energy', risk: 5, target: 5_000, monthlyAmount: 150, contributed: 2_250, value: 2_138, returnPct: -5 })
const retirement = makeGoal({ id: 'goal_0005', name: 'Retirement top-up', status: 'paused', nextDepositDate: null })
const japan = makeGoal({ id: 'goal_0006', name: 'Japan trip', status: 'scheduled', contributed: 0, value: 0, returnPct: 0, target: 3_000, monthlyAmount: 200 })

const portfolios = [makePortfolio(), makePortfolio({ id: 'clean-energy', name: 'Clean Energy', risk: 5, assumedReturnPct: 8 })]

const row = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}:`) })

function renderList(goals = [house, climate, retirement, japan]) {
  serveApi({ goals, portfolios, overview: makeOverview({ monthlyTotal: 1_400, nextDepositDate: '2026-12-01' }) })
  const onOpenGoal = vi.fn()
  const onNewGoal = vi.fn()
  const view = renderWithProviders(<GoalList onOpenGoal={onOpenGoal} onNewGoal={onNewGoal} />)
  return { ...view, onOpenGoal, onNewGoal }
}

describe('GoalList', () => {
  it('shows each goal’s progress, value and return', async () => {
    renderList()

    const houseRow = await screen.findByRole('button', { name: /^House deposit:/ })
    expect(houseRow).toHaveAccessibleName(/\$7,140, 36% of \$20,000\. On track for /)
    expect(within(houseRow).getByText('$7,140')).toBeInTheDocument()
    expect(within(houseRow).getByText('+19.0%')).toHaveAttribute('data-tone', 'gain')
    expect(within(houseRow).getByTitle('Risk 4 of 5')).toHaveAttribute('aria-label', 'Higher risk, 4 of 5')
    expect(within(row('Climate bet')).getByText('−5.0%')).toHaveAttribute('data-tone', 'loss')
  })

  it('projects when each goal is on track to be reached', async () => {
    renderList()

    // $7,140 now + $500/mo at 7% a year reaches $20,000 in Oct 2028.
    expect(within(await screen.findByRole('button', { name: /^House deposit:/ })).getByText('On track for Oct 2028')).toBeInTheDocument()
  })

  it('shows a goal that hasn’t started as starting, not as $0 and 0%', async () => {
    renderList()

    const japanRow = await screen.findByRole('button', { name: /^Japan trip:/ })
    expect(within(japanRow).getByText('Starts Dec 1')).toBeInTheDocument()
    expect(within(japanRow).getByText('First deposit Dec 1')).toBeInTheDocument()
    expect(within(japanRow).queryByText('0.0%')).not.toBeInTheDocument()
  })

  it('marks paused goals', async () => {
    renderList()

    const pausedRow = await screen.findByRole('button', { name: /^Retirement top-up:/ })
    expect(within(pausedRow).getByText('Paused')).toBeInTheDocument()
    expect(within(pausedRow).getByText('Deposits paused')).toBeInTheDocument()
  })

  it('shows the monthly total and next deposit in the header', async () => {
    renderList()

    expect(await screen.findByText(/a month · next deposit Dec 1/)).toHaveTextContent('$1,400 a month · next deposit Dec 1')
  })

  it('opens a goal, and starts a new one', async () => {
    const { user, onOpenGoal, onNewGoal } = renderList()

    await user.click(await screen.findByRole('button', { name: /^Climate bet:/ }))
    expect(onOpenGoal).toHaveBeenCalledWith('goal_0004')

    await user.click(screen.getByRole('button', { name: 'New goal' }))
    expect(onNewGoal).toHaveBeenCalled()
  })

  it('invites you to start when there are no goals', async () => {
    renderList([])

    expect(await screen.findByText('No goals yet')).toBeInTheDocument()
  })

  it('offers a retry when goals fail to load', async () => {
    let attempts = 0
    routeFetch(({ path }) => {
      if (path !== '/api/goals') return jsonResponse(200, path === '/api/summary' ? makeOverview() : { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } })
      attempts += 1
      return attempts === 1 ? jsonResponse(500, { error: 'Internal server error.' }) : jsonResponse(200, { data: [house], meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 } })
    })
    const { user } = renderWithProviders(<GoalList onOpenGoal={() => {}} onNewGoal={() => {}} />)

    expect(await screen.findByText("Couldn't load your goals")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: /^House deposit:/ })).toBeInTheDocument()
  })
})
