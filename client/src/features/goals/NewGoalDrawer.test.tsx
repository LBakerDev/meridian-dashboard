import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeGoal, makePortfolio } from '../../test/factories.ts'
import { serveApi } from '../../test/fakeApi.ts'
import { jsonResponse, type FetchCall } from '../../test/http.ts'
import { renderWithProviders } from '../../test/render.tsx'
import { NewGoalDrawer } from './NewGoalDrawer.tsx'

// Dates in messages depend on today: pin it to Nov 5, 2026.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 5, 9))
})
afterEach(() => {
  vi.useRealTimers()
})

const growth = makePortfolio() // Core Growth, from $25/mo, 7% assumed
const bonds = makePortfolio({ id: 'bond-ladder', name: 'Bond Ladder', category: 'Bonds', risk: 1, assumedReturnPct: 3, feePct: 0.2 })
const crypto = makePortfolio({ id: 'crypto-pioneers', name: 'Crypto Pioneers', status: 'closed' })
const created = makeGoal({ id: 'goal_0007', name: 'Wedding', status: 'scheduled', contributed: 0, value: 0, nextDepositDate: '2026-12-01' })

function setup(onWrite?: (call: FetchCall) => Response | undefined) {
  const fetchMock = serveApi({ portfolios: [growth, bonds, crypto] }, onWrite)
  const onClose = vi.fn()
  const view = renderWithProviders(<NewGoalDrawer opened onClose={onClose} />)
  return { ...view, fetchMock, onClose }
}

const posts = (fetchMock: ReturnType<typeof serveApi>) => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')

async function pick(user: ReturnType<typeof setup>['user'], name: string) {
  await user.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) }))
}

async function fillValid(user: ReturnType<typeof setup>['user']) {
  await user.type(screen.getByLabelText("What's it for?"), 'Wedding')
  await user.type(screen.getByLabelText('Target'), '15000')
  await user.type(screen.getByLabelText('Each month'), '400')
  await user.click(screen.getByRole('checkbox', { name: 'Take $400 from Chase ••4821 on the 1st of each month' }))
}

describe('NewGoalDrawer', () => {
  it('offers only portfolios that are open to new goals', async () => {
    setup()

    expect(await screen.findByRole('button', { name: /^Core Growth/ })).toHaveTextContent('Stocks · from $25/mo · 0.25% a year')
    expect(screen.getByRole('button', { name: /^Bond Ladder/ })).toBeInTheDocument()
    expect(screen.queryByText('Crypto Pioneers')).not.toBeInTheDocument()
  })

  it('checks the form before sending anything', async () => {
    const { user, fetchMock } = setup()
    await pick(user, 'Core Growth')

    await user.click(screen.getByRole('button', { name: 'Create goal' }))

    expect(screen.getByText('Give your goal a name.')).toBeInTheDocument()
    expect(screen.getByText('Set a target of at least $100.')).toBeInTheDocument()
    expect(screen.getByText('Enter a monthly amount.')).toBeInTheDocument()
    expect(screen.getByText('Confirm the monthly deposit to continue.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Each month'), '10')
    await user.click(screen.getByRole('button', { name: 'Create goal' }))
    expect(screen.getByText('Core Growth needs at least $25 a month.')).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(0)
  })

  it('projects when you would reach the target as you type', async () => {
    const { user } = setup()
    await pick(user, 'Core Growth')

    expect(screen.getByText('Enter a target and a monthly amount to see when you’d get there.'.replace('’', "'"))).toBeInTheDocument()
    await user.type(screen.getByLabelText('Target'), '15000')
    await user.type(screen.getByLabelText('Each month'), '400')

    expect(screen.getByText(/you'd reach/)).toHaveTextContent(/At \$400 a month you'd reach \$15,000 around [A-Z][a-z]{2} \d{4}\./)
    expect(screen.getByText('Assumes 7% a year. Returns aren’t guaranteed.'.replace('’', "'"))).toBeInTheDocument()
  })

  it('creates the goal, confirms it, and closes', async () => {
    const { user, fetchMock, onClose } = setup((call) => (call.path === '/api/goals' ? jsonResponse(201, created) : undefined))
    await pick(user, 'Core Growth')
    await fillValid(user)

    await user.click(screen.getByRole('button', { name: 'Create goal' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(JSON.parse(String(posts(fetchMock)[0][1]?.body))).toEqual({
      portfolioId: 'core-growth',
      name: 'Wedding',
      target: 15_000,
      monthlyAmount: 400,
      acknowledged: true,
    })
    expect(await screen.findByText('Goal created')).toBeInTheDocument()
    expect(screen.getByText('Wedding · first deposit Dec 1')).toBeInTheDocument()
  })

  it("shows the server's field errors under the fields", async () => {
    const { user } = setup(() =>
      jsonResponse(400, { error: 'Please correct the highlighted fields.', fields: { monthlyAmount: 'The most you can deposit monthly is $10,000.' } }),
    )
    await pick(user, 'Core Growth')
    await fillValid(user)

    await user.click(screen.getByRole('button', { name: 'Create goal' }))

    expect(await screen.findByText('The most you can deposit monthly is $10,000.')).toBeInTheDocument()
    expect(screen.getByLabelText('Each month')).toHaveAttribute('aria-invalid', 'true')
  })

  it('explains a portfolio that closed, keeps what was typed, and offers another', async () => {
    const { user } = setup(() => jsonResponse(409, { error: 'Core Growth is no longer open to new goals.' }))
    await pick(user, 'Core Growth')
    await fillValid(user)

    await user.click(screen.getByRole('button', { name: 'Create goal' }))

    expect(await screen.findByText('This portfolio is no longer available')).toBeInTheDocument()
    expect(screen.getByLabelText("What's it for?")).toHaveValue('Wedding')

    await user.click(screen.getByRole('button', { name: 'Choose another portfolio' }))
    expect(await screen.findByRole('button', { name: /^Bond Ladder/ })).toBeInTheDocument()
  })
})
