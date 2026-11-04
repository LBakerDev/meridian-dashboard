import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Commitment, Fund } from '../../api/types.ts'
import { makeCommitment, makeFund, makePage } from '../../test/factories.ts'
import { jsonResponse, routeFetch } from '../../test/http.ts'
import { renderWithProviders } from '../../test/render.tsx'
import { FundPicker } from './FundPicker.tsx'

// Close-date warnings depend on today, so pin it: Wednesday, October 21, 2026.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 21, 9, 0))
})
afterEach(() => {
  vi.useRealTimers()
})

const northwind = makeFund() // open, closes Dec 15 2026, $250K min, 18% target, 2% / 20%
const granite = makeFund({ id: 'fund_granite_ii', name: 'Granite Secondaries II', manager: 'Granite Partners', strategy: 'Secondaries', closeDate: '2026-10-15' })
const harborline = makeFund({ id: 'fund_harborline_i', name: 'Harborline Secondaries Fund I', manager: 'Harborline Capital', strategy: 'Secondaries', closeDate: '2026-10-21' })
const quarry = makeFund({ id: 'fund_quarry', name: 'Quarry Special Situations Fund', manager: 'Quarry Capital', stage: 'closing_soon', closeDate: '2026-10-31' })
const fairhaven = makeFund({ id: 'fund_fairhaven_iv', name: 'Fairhaven Real Estate Partners IV', manager: 'Fairhaven Partners', strategy: 'Real Estate', stage: 'closing_soon', closeDate: '2026-12-01' })
const dunmore = makeFund({ id: 'fund_dunmore_ii', name: 'Dunmore Opportunistic Credit Fund II', manager: 'Dunmore Capital', strategy: 'Private Credit', currency: 'EUR', closeDate: '2027-01-15' })
const closed = makeFund({ id: 'fund_old_i', name: 'Old Harbour Fund I', manager: 'Old Harbour', stage: 'closed', closeDate: '2025-01-01' })

const allFunds = [northwind, dunmore, closed, fairhaven, quarry, harborline, granite]

const holdings = [
  makeCommitment({ id: 'cm_1', fundId: northwind.id, fundName: northwind.name, committed: 2_000_000 }),
  makeCommitment({ id: 'cm_2', fundId: northwind.id, fundName: northwind.name, committed: 500_000, status: 'pending_close' }),
]

function serve({ funds = allFunds, commitments = holdings }: { funds?: Fund[]; commitments?: Commitment[] } = {}) {
  return routeFetch(({ path }) =>
    path.startsWith('/api/funds') ? jsonResponse(200, makePage(funds)) : jsonResponse(200, makePage(commitments)),
  )
}

const option = (name: string) => screen.getByRole('button', { name: new RegExp(name) })

describe('FundPicker', () => {
  it('shows a loading state while funds load', () => {
    routeFetch(() => new Promise<Response>(() => {}))
    renderWithProviders(<FundPicker onSelect={() => {}} />)

    expect(screen.getByLabelText('Loading funds')).toHaveAttribute('aria-busy', 'true')
  })

  it('lists only funds accepting commitments, soonest close first and past-close funds last', async () => {
    serve()
    renderWithProviders(<FundPicker onSelect={() => {}} />)

    const list = await screen.findByRole('list', { name: 'Funds accepting commitments' })
    const names = within(list)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('[title]')?.getAttribute('title'))

    expect(names).toEqual([harborline.name, quarry.name, fairhaven.name, northwind.name, dunmore.name, granite.name])
    expect(screen.getByText('6 funds accepting commitments')).toBeInTheDocument()
    expect(screen.queryByText(closed.name)).not.toBeInTheDocument()
  })

  it('warns when a close date is near, today, or already passed', async () => {
    serve()
    renderWithProviders(<FundPicker onSelect={() => {}} />)
    await screen.findByRole('list', { name: 'Funds accepting commitments' })

    expect(within(option(granite.name)).getByText('Past close date')).toBeInTheDocument()
    expect(within(option(harborline.name)).getByText('Closes today')).toBeInTheDocument()
    expect(within(option(quarry.name)).getByText('10 days left')).toBeInTheDocument()
    expect(within(option(fairhaven.name)).getByText('Closing soon')).toBeInTheDocument()
    expect(within(option(northwind.name)).getByText('Closes Dec 15, 2026')).toBeInTheDocument()
  })

  it("shows each fund's strategy, minimum and target, in the fund's currency", async () => {
    serve()
    renderWithProviders(<FundPicker onSelect={() => {}} />)
    await screen.findByRole('list', { name: 'Funds accepting commitments' })

    expect(option(northwind.name)).toHaveTextContent('Private Equity · Min $250K · Target 18.0%')
    expect(option(dunmore.name)).toHaveTextContent('Private Credit · Min €250K · Target 18.0%')
    // Manager and fees wait for the next step, once a fund is chosen.
    expect(option(northwind.name)).not.toHaveTextContent('Northwind Capital Partners')
    expect(option(northwind.name)).not.toHaveTextContent('Fees')
  })

  it('shows what you already hold in a fund', async () => {
    serve()
    renderWithProviders(<FundPicker onSelect={() => {}} />)
    await screen.findByRole('list', { name: 'Funds accepting commitments' })

    expect(option(northwind.name)).toHaveTextContent('You hold $2.5M')
    expect(option(northwind.name)).not.toHaveTextContent('pending close')
    expect(option(quarry.name)).not.toHaveTextContent('You hold')
  })

  it('still lists funds if holdings fail to load', async () => {
    routeFetch(({ path }) =>
      path.startsWith('/api/funds') ? jsonResponse(200, makePage(allFunds)) : jsonResponse(500, { error: 'Internal server error.' }),
    )
    renderWithProviders(<FundPicker onSelect={() => {}} />)

    expect(await screen.findByRole('list', { name: 'Funds accepting commitments' })).toBeInTheDocument()
    expect(option(northwind.name)).not.toHaveTextContent('You hold')
  })

  it('filters by fund name, manager or strategy', async () => {
    serve()
    const { user } = renderWithProviders(<FundPicker onSelect={() => {}} />)
    await screen.findByRole('list', { name: 'Funds accepting commitments' })

    await user.type(screen.getByRole('textbox', { name: 'Search funds' }), 'secondaries')
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('2 of 6 funds')).toBeInTheDocument()

    await user.clear(screen.getByRole('textbox', { name: 'Search funds' }))
    await user.type(screen.getByRole('textbox', { name: 'Search funds' }), 'dunmore')
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1)

    // Managers aren't shown in the list, but you can still find a fund by one.
    await user.clear(screen.getByRole('textbox', { name: 'Search funds' }))
    await user.type(screen.getByRole('textbox', { name: 'Search funds' }), 'quarry capital')
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1)
    expect(option(quarry.name)).toBeInTheDocument()
  })

  it('offers to clear a search that matches nothing', async () => {
    serve()
    const { user } = renderWithProviders(<FundPicker onSelect={() => {}} />)
    await screen.findByRole('list', { name: 'Funds accepting commitments' })

    await user.type(screen.getByRole('textbox', { name: 'Search funds' }), 'zzz')
    const message = screen.getByText('No funds match “zzz”.')

    // The × in the search box is also "Clear search"; use the one in the message.
    await user.click(within(message.parentElement!).getByRole('button', { name: 'Clear search' }))
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(6)
  })

  it('says so when no fund is accepting commitments', async () => {
    serve({ funds: [closed] })
    renderWithProviders(<FundPicker onSelect={() => {}} />)

    expect(await screen.findByText('No funds are accepting commitments right now.')).toBeInTheDocument()
  })

  it('offers a retry when funds fail to load', async () => {
    let attempts = 0
    routeFetch(({ path }) => {
      if (!path.startsWith('/api/funds')) return jsonResponse(200, makePage(holdings))
      attempts += 1
      return attempts === 1 ? jsonResponse(500, { error: 'Internal server error.' }) : jsonResponse(200, makePage(allFunds))
    })
    const { user } = renderWithProviders(<FundPicker onSelect={() => {}} />)

    expect(await screen.findByText("Couldn't load funds")).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('list', { name: 'Funds accepting commitments' })).toBeInTheDocument()
  })

  it('reports the chosen fund', async () => {
    serve()
    const onSelect = vi.fn()
    const { user } = renderWithProviders(<FundPicker onSelect={onSelect} />)
    await screen.findByRole('list', { name: 'Funds accepting commitments' })

    await user.click(option(quarry.name))

    expect(onSelect).toHaveBeenCalledWith(quarry)
  })
})
