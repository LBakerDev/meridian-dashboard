import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeActivity, makeGoal, makePortfolio } from '../../test/factories.ts'
import { serveApi } from '../../test/fakeApi.ts'
import { jsonResponse, type FetchCall } from '../../test/http.ts'
import { renderWithProviders } from '../../test/render.tsx'
import { GoalDrawer } from './GoalDrawer.tsx'

// Projections depend on today: pin it to Nov 5, 2026.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 5, 9))
})
afterEach(() => {
  vi.useRealTimers()
})

const house = makeGoal() // $7,140 of $20,000, $500/mo in Core Growth (7%): on track for Oct 2028
const deposit = makeActivity()

function setup(onWrite?: (call: FetchCall) => Response | undefined) {
  const fetchMock = serveApi({ goals: [house], portfolios: [makePortfolio()], activity: [deposit] }, onWrite)
  const onClose = vi.fn()
  const view = renderWithProviders(<GoalDrawer goalId="goal_0001" onClose={onClose} />)
  return { ...view, fetchMock, onClose }
}

const writes = (fetchMock: ReturnType<typeof serveApi>) => fetchMock.mock.calls.filter(([, init]) => init?.method && init.method !== 'GET')

describe('GoalDrawer · overview', () => {
  it('shows the goal, its progress and its recent activity', async () => {
    setup()

    expect(await screen.findByRole('dialog', { name: 'House deposit' })).toBeInTheDocument()
    expect(await screen.findByText('$7,140')).toBeInTheDocument()
    expect(screen.getByText('+19.0%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progress to target' })).toHaveAttribute('aria-valuenow', '36')
    expect(await screen.findByText('On track for Oct 2028')).toBeInTheDocument()
    expect(await screen.findByText('Monthly deposit from Chase ••4821')).toBeInTheDocument()
  })
})

describe('GoalDrawer · add money', () => {
  it('shows how a deposit moves the date, adds it, confirms, and goes back to the goal', async () => {
    const { user, fetchMock } = setup((call) =>
      call.path === '/api/goals/goal_0001/deposits' ? jsonResponse(201, { goal: house, activity: deposit }) : undefined,
    )
    await user.click(await screen.findByRole('button', { name: 'Add money' }))
    expect(screen.getByRole('dialog', { name: 'Add money' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '$500' }))
    expect(screen.getByText(/This moves House deposit from/)).toHaveTextContent('This moves House deposit from Oct 2028 to Sep 2028.')

    await user.click(screen.getByRole('button', { name: 'Add $500' }))

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'House deposit' })).toBeInTheDocument())
    expect(JSON.parse(String(writes(fetchMock)[0][1]?.body))).toEqual({ amount: 500 })
    expect(screen.getByText('$500 added to House deposit')).toBeInTheDocument()
  })

  it('checks the amount before sending anything', async () => {
    const { user, fetchMock } = setup()
    await user.click(await screen.findByRole('button', { name: 'Add money' }))

    await user.type(screen.getByLabelText('Amount'), '5')
    await user.click(screen.getByRole('button', { name: 'Add $5' }))

    expect(screen.getByText('The minimum one-off deposit is $10.')).toBeInTheDocument()
    expect(writes(fetchMock)).toHaveLength(0)
  })

  it("shows the server's daily-limit message under the field", async () => {
    const { user } = setup(() =>
      jsonResponse(400, { error: 'Please correct the highlighted fields.', fields: { amount: 'You can add up to $10,000 a day ($200 left today).' } }),
    )
    await user.click(await screen.findByRole('button', { name: 'Add money' }))

    await user.type(screen.getByLabelText('Amount'), '500')
    await user.click(screen.getByRole('button', { name: 'Add $500' }))

    expect(await screen.findByText('You can add up to $10,000 a day ($200 left today).')).toBeInTheDocument()
  })

  it('keeps the amount after a network failure so it can be sent again', async () => {
    let attempts = 0
    const { user } = setup(() => {
      attempts += 1
      if (attempts === 1) throw new TypeError('Failed to fetch')
      return jsonResponse(201, { goal: house, activity: deposit })
    })
    await user.click(await screen.findByRole('button', { name: 'Add money' }))
    await user.type(screen.getByLabelText('Amount'), '250')
    await user.click(screen.getByRole('button', { name: 'Add $250' }))

    expect(await screen.findByText("Couldn't reach the server")).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toHaveValue('$250')

    await user.click(screen.getByRole('button', { name: 'Add $250' }))
    expect(await screen.findByText('$250 added to House deposit')).toBeInTheDocument()
  })
})

describe('GoalDrawer · edit', () => {
  it('shows the new date before saving, then saves the changes', async () => {
    const { user, fetchMock } = setup((call) => (call.method === 'PATCH' ? jsonResponse(200, house) : undefined))
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('dialog', { name: 'Edit goal' })).toBeInTheDocument()

    const monthly = screen.getByLabelText('Each month')
    await user.clear(monthly)
    await user.type(monthly, '800')
    expect(screen.getByText(/^At/)).toHaveTextContent('At $800 a month: Feb 2028')
    expect(screen.getByText('Was: Oct 2028')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'House deposit' })).toBeInTheDocument())
    expect(JSON.parse(String(writes(fetchMock)[0][1]?.body))).toEqual({ name: 'House deposit', target: 20_000, monthlyAmount: 800, paused: false })
    expect(screen.getByText('Goal updated')).toBeInTheDocument()
  })

  it('pauses deposits', async () => {
    const { user, fetchMock } = setup((call) => (call.method === 'PATCH' ? jsonResponse(200, { ...house, status: 'paused' }) : undefined))
    await user.click(await screen.findByRole('button', { name: 'Edit' }))

    await user.click(screen.getByRole('switch', { name: /Pause monthly deposits/ }))

    expect(screen.getByLabelText('Each month')).toBeDisabled()
    expect(screen.getByText('Deposits stop until you resume. House deposit stays invested.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(writes(fetchMock)).toHaveLength(1))
    expect(JSON.parse(String(writes(fetchMock)[0][1]?.body))).toMatchObject({ paused: true })
  })

  it('won’t set the target below what’s already saved', async () => {
    const { user, fetchMock } = setup()
    await user.click(await screen.findByRole('button', { name: 'Edit' }))

    const target = screen.getByLabelText('Target')
    await user.clear(target)
    await user.type(target, '5000')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(screen.getByText("Set a target above what's already saved ($7,140).")).toBeInTheDocument()
    expect(writes(fetchMock)).toHaveLength(0)
  })
})
