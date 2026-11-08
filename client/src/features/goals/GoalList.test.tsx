import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeGoal, makeOverview, makePortfolio } from '../../test/factories.ts'
import { serveApi } from '../../test/fakeApi.ts'
import { jsonResponse, routeFetch, type FetchCall } from '../../test/http.ts'
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
    // Said once: the date on the right, not again under the bar.
    expect(within(japanRow).getByText('Not started yet')).toBeInTheDocument()
    expect(within(japanRow).queryByText('First deposit Dec 1')).not.toBeInTheDocument()
    expect(within(japanRow).queryByText('0.0%')).not.toBeInTheDocument()
  })

  it('marks paused goals once, under the bar, and still shows their value', async () => {
    renderList()

    const pausedRow = await screen.findByRole('button', { name: /^Retirement top-up:/ })
    expect(within(pausedRow).getByText('Deposits paused')).toBeInTheDocument()
    expect(within(pausedRow).queryByText('Paused')).not.toBeInTheDocument()
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

describe('GoalList · reorder', () => {
  /** Serves the list and saves a new order the way the server does (in place). */
  function renderReorderable(onWrite?: (call: FetchCall) => Response | undefined) {
    const goals = [house, climate, retirement, japan]
    const writes: FetchCall[] = []
    serveApi({ goals, portfolios, overview: makeOverview() }, (call) => {
      writes.push(call)
      if (onWrite) return onWrite(call)
      if (call.method === 'PUT' && call.path === '/api/goals/order') {
        const byId = new Map(goals.map((g) => [g.id, g]))
        const ids = (call.body as { ids: string[] }).ids
        goals.splice(0, goals.length, ...ids.flatMap((id) => byId.get(id) ?? []))
        return jsonResponse(200, { data: goals })
      }
      return undefined
    })
    const view = renderWithProviders(<GoalList onOpenGoal={vi.fn()} onNewGoal={vi.fn()} />)
    return { ...view, writes }
  }

  /** Goal names in the order they're shown. */
  const order = () => screen.getAllByRole('button', { name: /^Reorder / }).map((grip) => grip.getAttribute('aria-label')?.replace('Reorder ', ''))
  const original = ['House deposit', 'Climate bet', 'Retirement top-up', 'Japan trip']

  it('moves a goal with the keyboard, saving only when it is dropped', async () => {
    const { user, writes } = renderReorderable()
    const grip = await screen.findByRole('button', { name: 'Reorder Climate bet' })

    grip.focus()
    await user.keyboard(' ')
    expect(screen.getByText(/Picked up Climate bet, position 2 of 4/)).toBeInTheDocument()

    await user.keyboard('{ArrowUp}')
    expect(order()).toEqual(['Climate bet', 'House deposit', 'Retirement top-up', 'Japan trip'])
    expect(writes).toHaveLength(0)

    await user.keyboard(' ')
    await waitFor(() => expect(writes).toHaveLength(1))
    expect(writes[0]).toMatchObject({ method: 'PUT', path: '/api/goals/order', body: { ids: ['goal_0004', 'goal_0001', 'goal_0005', 'goal_0006'] } })
    expect(order()).toEqual(['Climate bet', 'House deposit', 'Retirement top-up', 'Japan trip'])
    expect(screen.getByRole('button', { name: 'Reorder Climate bet' })).toHaveFocus()
  })

  it('puts a picked-up goal back on Escape, and saves nothing', async () => {
    const { user, writes } = renderReorderable()
    ;(await screen.findByRole('button', { name: 'Reorder House deposit' })).focus()

    await user.keyboard(' ')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    await user.keyboard('{Escape}')

    expect(order()).toEqual(original)
    expect(writes).toHaveLength(0)
  })

  it('offers a Move menu, so reordering never needs a drag', async () => {
    const { user, writes } = renderReorderable()
    await user.click(await screen.findByRole('button', { name: 'Reorder House deposit' }))

    const menu = screen.getByRole('menu', { name: 'Move House deposit' })
    expect(within(menu).queryByRole('menuitem', { name: 'Move up' })).not.toBeInTheDocument() // already first
    await user.click(within(menu).getByRole('menuitem', { name: 'Move to bottom' }))

    await waitFor(() => expect(writes).toHaveLength(1))
    expect(writes[0].body).toEqual({ ids: ['goal_0004', 'goal_0005', 'goal_0006', 'goal_0001'] })
    expect(order().at(-1)).toBe('House deposit')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('puts the old order back, and says so, if the save fails', async () => {
    const { user } = renderReorderable((call) => (call.method === 'PUT' ? jsonResponse(500, { error: 'Internal server error.' }) : undefined))
    await user.click(await screen.findByRole('button', { name: 'Reorder Japan trip' }))
    await user.click(screen.getByRole('menuitem', { name: 'Move to top' }))

    expect(await screen.findByText("Couldn't save the new order")).toBeInTheDocument()
    await waitFor(() => expect(order()).toEqual(original))
  })
})
