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
const balanced = makePortfolio({ id: 'balanced-60-40', name: 'Balanced 60/40', category: 'Stocks and bonds', risk: 3, assumedReturnPct: 5.5, description: 'Sixty percent stocks, forty percent bonds.' })
const crypto = makePortfolio({ id: 'crypto-pioneers', name: 'Crypto Pioneers', status: 'closed' })
const created = makeGoal({ id: 'goal_0007', name: 'Wedding', status: 'scheduled', contributed: 0, value: 0, streak: 0, nextDepositDate: '2026-12-01' })

function setup(onWrite?: (call: FetchCall) => Response | undefined) {
  const fetchMock = serveApi({ portfolios: [growth, balanced, crypto] }, onWrite)
  const onClose = vi.fn()
  const view = renderWithProviders(<NewGoalDrawer opened onClose={onClose} />)
  return { ...view, fetchMock, onClose }
}

type User = ReturnType<typeof setup>['user']
const posts = (fetchMock: ReturnType<typeof serveApi>) => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')

/** Steps 1 and 2: "Wedding", $15,000, Core Growth. */
async function toStepThree(user: User) {
  await user.type(screen.getByLabelText('Goal'), 'Wedding')
  await user.type(screen.getByLabelText('Target'), '15000')
  await user.click(screen.getByRole('button', { name: 'Next: how to invest it' }))
  await user.click(await screen.findByRole('button', { name: /^Core Growth/ }))
}

describe('NewGoalDrawer', () => {
  it('starts with what you are saving for, and says which step you are on', () => {
    setup()

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What are you saving for?' })).toBeInTheDocument()
  })

  it('fills the name from a suggestion, and checks the basics before moving on', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'Next: how to invest it' }))
    expect(screen.getByText('Give your goal a name.')).toBeInTheDocument()
    expect(screen.getByText('Set a target of at least $100.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Travel' }))
    expect(screen.getByLabelText('Goal')).toHaveValue('Travel')
  })

  it('explains the portfolio choice, flags a good default, and leaves out closed ones', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText('Goal'), 'Wedding')
    await user.type(screen.getByLabelText('Target'), '15000')
    await user.click(screen.getByRole('button', { name: 'Next: how to invest it' }))

    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
    expect(screen.getByText(/More dots means more risk/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^Balanced 60\/40/ })).toHaveTextContent('Good default')
    expect(screen.getByRole('button', { name: /^Balanced 60\/40/ })).toHaveTextContent('Sixty percent stocks, forty percent bonds.')
    expect(screen.queryByText('Crypto Pioneers')).not.toBeInTheDocument()
  })

  it('keeps what you typed when you go back', async () => {
    const { user } = setup()
    await toStepThree(user)

    await user.click(screen.getByRole('button', { name: '← Change portfolio' }))
    await user.click(screen.getByRole('button', { name: '← Back' }))

    expect(screen.getByLabelText('Goal')).toHaveValue('Wedding')
  })

  it('projects the date as you type the monthly amount, then creates the goal', async () => {
    const { user, fetchMock, onClose } = setup((call) => (call.path === '/api/goals' ? jsonResponse(201, created) : undefined))
    await toStepThree(user)

    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument()
    expect(screen.getByText('Wedding: $15,000 in Core Growth. You can change or pause it any time.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Each month'), '400')
    expect(screen.getByText(/you'd reach/)).toHaveTextContent(/At \$400 a month you'd reach \$15,000 around [A-Z][a-z]{2} \d{4}\./)

    await user.click(screen.getByRole('checkbox', { name: 'Take $400 from Chase ••4821 on the 1st of each month' }))
    await user.click(screen.getByRole('button', { name: 'Create goal' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(JSON.parse(String(posts(fetchMock)[0][1]?.body))).toEqual({
      portfolioId: 'core-growth',
      name: 'Wedding',
      target: 15_000,
      monthlyAmount: 400,
      acknowledged: true,
    })
    expect(await screen.findByText('Wedding created')).toBeInTheDocument()
    expect(screen.getByText('First deposit Dec 1')).toBeInTheDocument()
  })

  it('checks the monthly amount and confirmation before sending', async () => {
    const { user, fetchMock } = setup()
    await toStepThree(user)

    await user.type(screen.getByLabelText('Each month'), '10')
    await user.click(screen.getByRole('button', { name: 'Create goal' }))

    expect(screen.getByText('Core Growth needs at least $25 a month.')).toBeInTheDocument()
    expect(screen.getByText('Confirm the monthly deposit to continue.')).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(0)
  })

  it('sends you back to the details when the server rejects the name', async () => {
    const { user } = setup(() => jsonResponse(400, { error: 'Please correct the highlighted fields.', fields: { name: 'Keep the name under 40 characters.' } }))
    await toStepThree(user)
    await user.type(screen.getByLabelText('Each month'), '400')
    await user.click(screen.getByRole('checkbox', { name: /Take \$400/ }))
    await user.click(screen.getByRole('button', { name: 'Create goal' }))

    expect(await screen.findByText('Check your goal details')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit goal details' }))
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
  })

  it('explains a portfolio that closed, and offers another', async () => {
    const { user } = setup(() => jsonResponse(409, { error: 'Core Growth is no longer open to new goals.' }))
    await toStepThree(user)
    await user.type(screen.getByLabelText('Each month'), '400')
    await user.click(screen.getByRole('checkbox', { name: /Take \$400/ }))
    await user.click(screen.getByRole('button', { name: 'Create goal' }))

    expect(await screen.findByText('This portfolio is no longer available')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Choose another portfolio' }))
    expect(await screen.findByText('Step 2 of 3')).toBeInTheDocument()
  })
})
