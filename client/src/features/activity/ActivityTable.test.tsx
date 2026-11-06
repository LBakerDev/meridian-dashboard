import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeActivity } from '../../test/factories.ts'
import { requestedPaths, serveApi } from '../../test/fakeApi.ts'
import { jsonResponse, routeFetch } from '../../test/http.ts'
import { renderWithProviders } from '../../test/render.tsx'
import { ActivityTable } from './ActivityTable.tsx'

const deposit = makeActivity()
const dividend = makeActivity({ id: 'act_2', date: '2026-08-15', type: 'dividend', description: 'Dividend reinvested · Dividend Income', goalId: 'goal_0002', goalName: 'Emergency cushion', amount: 18.4 })
const fee = makeActivity({ id: 'act_3', date: '2026-10-28', type: 'fee', description: 'Quarterly management fee', goalId: null, goalName: null, amount: -9.6 })

/** 25 deposits: three pages of 10. */
const many = Array.from({ length: 25 }, (_, i) => makeActivity({ id: `act_m${i + 1}`, description: `Deposit ${i + 1}` }))

const activityRequests = (fetchMock: ReturnType<typeof serveApi>) => requestedPaths(fetchMock, '/api/activity')
const row = (text: string) => screen.getByRole('row', { name: new RegExp(text) })

describe('ActivityTable', () => {
  it('lists activity newest first, ten at a time', async () => {
    const fetchMock = serveApi({ activity: [deposit, dividend, fee] })
    renderWithProviders(<ActivityTable />)

    const depositRow = await screen.findByRole('row', { name: /Monthly deposit/ })
    expect(within(depositRow).getByText('Nov 1, 2026')).toBeInTheDocument()
    expect(within(depositRow).getByText('House deposit')).toBeInTheDocument()
    expect(within(depositRow).getByText('+$500')).toBeInTheDocument()
    expect(activityRequests(fetchMock)).toEqual(['/api/activity?sort=date&order=desc&page=1&pageSize=10'])
  })

  it('shows dividends as gains, and fees with a minus and no goal', async () => {
    serveApi({ activity: [deposit, dividend, fee] })
    renderWithProviders(<ActivityTable />)

    await screen.findByRole('row', { name: /Dividend reinvested/ })
    expect(within(row('Dividend reinvested')).getByText('+$18.40')).toHaveAttribute('data-type', 'dividend')
    expect(within(row('Quarterly management fee')).getByText('−$9.60')).toBeInTheDocument()
    expect(within(row('Quarterly management fee')).getByText('—')).toBeInTheDocument()
  })

  it('filters by type', async () => {
    const fetchMock = serveApi({ activity: [deposit, dividend, fee] })
    const { user } = renderWithProviders(<ActivityTable />)
    await screen.findByRole('row', { name: /Monthly deposit/ })

    await user.click(screen.getByRole('radio', { name: 'Dividends' }))

    await waitFor(() => expect(activityRequests(fetchMock)).toContain('/api/activity?type=dividend&sort=date&order=desc&page=1&pageSize=10'))
    expect(await screen.findByRole('row', { name: /Dividend reinvested/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Monthly deposit/ })).not.toBeInTheDocument()
  })

  it('sorts by amount, largest first, and flips on a second click', async () => {
    const fetchMock = serveApi({ activity: [deposit] })
    const { user } = renderWithProviders(<ActivityTable />)
    await screen.findByRole('row', { name: /Monthly deposit/ })

    await user.click(screen.getByRole('button', { name: 'Amount' }))
    await waitFor(() => expect(activityRequests(fetchMock)).toContain('/api/activity?sort=amount&order=desc&page=1&pageSize=10'))
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toHaveAttribute('aria-sort', 'descending')

    await user.click(screen.getByRole('button', { name: 'Amount' }))
    await waitFor(() => expect(activityRequests(fetchMock)).toContain('/api/activity?sort=amount&order=asc&page=1&pageSize=10'))
  })

  it('restores the filter, sort and page from the URL', async () => {
    const fetchMock = serveApi({ activity: many })
    renderWithProviders(<ActivityTable />, { route: '/?type=deposit&sort=amount&order=asc&page=2' })

    expect(await screen.findByRole('row', { name: /Deposit 11\b/ })).toBeInTheDocument()
    expect(activityRequests(fetchMock)).toEqual(['/api/activity?type=deposit&sort=amount&order=asc&page=2&pageSize=10'])
    expect(screen.getByRole('radio', { name: 'Deposits' })).toBeChecked()
  })

  it('pages through activity', async () => {
    serveApi({ activity: many })
    const { user } = renderWithProviders(<ActivityTable />)

    await screen.findByRole('row', { name: /Deposit 1\b/ })
    expect(screen.getByText(/^Showing/)).toHaveTextContent('Showing 1–10 of 25')

    await user.click(screen.getByRole('button', { name: 'Next page' }))

    expect(await screen.findByRole('row', { name: /Deposit 11\b/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
  })

  it('offers to show everything when a filter matches nothing', async () => {
    serveApi({ activity: [deposit] })
    const { user } = renderWithProviders(<ActivityTable />, { route: '/?type=fee' })

    expect(await screen.findByText('No fees yet.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all' }))
    expect(await screen.findByRole('row', { name: /Monthly deposit/ })).toBeInTheDocument()
  })

  it('offers a retry when activity fails to load', async () => {
    let attempts = 0
    routeFetch(() => {
      attempts += 1
      return attempts === 1
        ? jsonResponse(500, { error: 'Internal server error.' })
        : jsonResponse(200, { data: [deposit], meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 } })
    })
    const { user } = renderWithProviders(<ActivityTable />)

    expect(await screen.findByText("Couldn't load activity")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('row', { name: /Monthly deposit/ })).toBeInTheDocument()
  })
})
