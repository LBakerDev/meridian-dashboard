import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Commitment } from '../../api/types.ts'
import { makeCommitment, makeFund, makePage } from '../../test/factories.ts'
import { jsonResponse, routeFetch } from '../../test/http.ts'
import { renderWithProviders } from '../../test/render.tsx'
import { CommitmentsTable } from './CommitmentsTable.tsx'

const silverpeak = makeCommitment() // active, USD, 2M committed, 1.68M NAV, 19.4% IRR
const cedarGrove = makeCommitment({
  id: 'cm_0005',
  fundId: 'fund_cedar_grove_ii',
  fundName: 'Cedar Grove Venture Fund II',
  manager: 'Cedar Grove Partners',
  committed: 500_000,
  called: 175_000,
  distributed: 0,
  nav: 168_000,
  netIrrPct: -3.1,
  netMoic: 0.96,
  netDpi: 0,
})
const dunmore = makeCommitment({
  id: 'cm_0018',
  fundId: 'fund_dunmore_credit_ii',
  fundName: 'Dunmore Opportunistic Credit Fund II',
  manager: 'Dunmore Capital',
  committed: 2_000_000,
  called: 1_300_000,
  nav: 1_180_000,
})
// As the server returns a commitment straight after POST: pending, with zeros rather than nulls.
const justCreated = makeCommitment({
  id: 'cm_0021',
  fundId: 'fund_northwind_iv',
  fundName: 'Northwind Buyout Fund IV',
  manager: 'Northwind Capital Partners',
  committed: 300_000,
  called: 0,
  distributed: 0,
  nav: 0,
  status: 'pending_close',
  netIrrPct: 0,
  netMoic: 0,
  netDpi: 0,
})

const funds = [
  makeFund({ id: 'fund_silverpeak_v', currency: 'USD' }),
  makeFund({ id: 'fund_cedar_grove_ii', currency: 'USD' }),
  makeFund({ id: 'fund_dunmore_credit_ii', currency: 'EUR' }),
  makeFund({ id: 'fund_northwind_iv', currency: 'USD' }),
]

/** Serves funds, and commitments paged the way the real server pages them. */
function serve({ commitments = [silverpeak, cedarGrove, dunmore, justCreated] }: { commitments?: Commitment[] } = {}) {
  return routeFetch(({ path }) => {
    if (path.startsWith('/api/funds')) return jsonResponse(200, makePage(funds))
    const query = new URLSearchParams(path.split('?')[1])
    const page = Number(query.get('page') ?? 1)
    const pageSize = Number(query.get('pageSize') ?? 25)
    return jsonResponse(200, {
      data: commitments.slice((page - 1) * pageSize, page * pageSize),
      meta: { page, pageSize, total: commitments.length, totalPages: Math.ceil(commitments.length / pageSize) },
    })
  })
}

/** 25 distinct commitments: three pages of 10. */
const many = Array.from({ length: 25 }, (_, i) =>
  makeCommitment({ id: `cm_${i + 1}`, fundName: `Test Fund ${i + 1}`, manager: `Test Manager ${i + 1}` }),
)

function commitmentRequests(fetchMock: ReturnType<typeof serve>) {
  return fetchMock.mock.calls.map(([path]) => String(path)).filter((path) => path.startsWith('/api/commitments'))
}

const rowFor = (fundName: string) => screen.getByRole('row', { name: new RegExp(fundName) })

describe('CommitmentsTable', () => {
  it('lists commitments, newest first by default', async () => {
    const fetchMock = serve()
    renderWithProviders(<CommitmentsTable />)

    const row = await screen.findByRole('row', { name: /Silverpeak Growth Equity V/ })
    expect(within(row).getByText('Sep 12, 2022')).toBeInTheDocument()
    expect(within(row).getByText('$2M')).toBeInTheDocument()
    expect(within(row).getByText('$1.68M')).toBeInTheDocument()
    expect(within(row).getByText('19.4%')).toBeInTheDocument()
    expect(within(row).getByText('1.57×')).toBeInTheDocument()
    expect(within(row).getByText('Active')).toBeInTheDocument()

    expect(commitmentRequests(fetchMock)).toEqual(['/api/commitments?pageSize=10&page=1&sort=dateCommitted&order=desc'])
  })

  it('shows "not yet valued" for pending commitments, even when the API sends zeros', async () => {
    serve()
    renderWithProviders(<CommitmentsTable />)

    const row = await screen.findByRole('row', { name: /Northwind Buyout Fund IV/ })
    expect(within(row).getAllByText('Not yet valued')).toHaveLength(3) // NAV, IRR, MOIC
    expect(within(row).getByText('Pending close')).toBeInTheDocument()
    expect(within(row).queryByText('0.0%')).not.toBeInTheDocument()
    expect(within(row).queryByText('0.00×')).not.toBeInTheDocument()
  })

  it("shows amounts in the fund's currency and tags non-USD rows", async () => {
    serve()
    renderWithProviders(<CommitmentsTable />)

    const row = await screen.findByRole('row', { name: /Dunmore Opportunistic Credit Fund II/ })
    expect(within(row).getByText('€2M')).toBeInTheDocument()
    expect(within(row).getByText('€1.18M')).toBeInTheDocument()
    expect(within(row).getByText('EUR')).toBeInTheDocument()
    expect(within(rowFor('Silverpeak')).queryByText('USD')).not.toBeInTheDocument()
  })

  it('marks losses', async () => {
    serve()
    renderWithProviders(<CommitmentsTable />)

    const row = await screen.findByRole('row', { name: /Cedar Grove Venture Fund II/ })
    expect(within(row).getByText('−3.1%')).toHaveAttribute('data-tone', 'loss')
    expect(within(row).getByText('0.96×')).toHaveAttribute('data-tone', 'loss')
    expect(within(rowFor('Silverpeak')).getByText('19.4%')).not.toHaveAttribute('data-tone')
  })

  it('sorts by a column, largest first, and flips on a second click', async () => {
    const fetchMock = serve()
    const { user } = renderWithProviders(<CommitmentsTable />)
    await screen.findByRole('row', { name: /Silverpeak/ })

    await user.click(screen.getByRole('button', { name: 'NAV' }))

    await waitFor(() => expect(commitmentRequests(fetchMock)).toContain('/api/commitments?pageSize=10&page=1&sort=nav&order=desc'))
    expect(screen.getByRole('columnheader', { name: 'NAV' })).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('columnheader', { name: 'Committed on' })).not.toHaveAttribute('aria-sort')

    await user.click(screen.getByRole('button', { name: 'NAV' }))

    await waitFor(() => expect(commitmentRequests(fetchMock)).toContain('/api/commitments?pageSize=10&page=1&sort=nav&order=asc'))
    expect(screen.getByRole('columnheader', { name: 'NAV' })).toHaveAttribute('aria-sort', 'ascending')
  })

  it('filters by status', async () => {
    const fetchMock = serve()
    const { user } = renderWithProviders(<CommitmentsTable />)
    await screen.findByRole('row', { name: /Silverpeak/ })

    await user.click(screen.getByRole('radio', { name: 'Pending close' }))

    await waitFor(() =>
      expect(commitmentRequests(fetchMock)).toContain('/api/commitments?pageSize=10&page=1&status=pending_close&sort=dateCommitted&order=desc'),
    )
    expect(screen.getByRole('radio', { name: 'Pending close' })).toBeChecked()
  })

  it('restores the filter and sort from the URL', async () => {
    const fetchMock = serve()
    renderWithProviders(<CommitmentsTable />, { route: '/?status=active&sort=nav&order=asc' })

    await screen.findByRole('row', { name: /Silverpeak/ })
    expect(commitmentRequests(fetchMock)).toEqual(['/api/commitments?pageSize=10&page=1&status=active&sort=nav&order=asc'])
    expect(screen.getByRole('radio', { name: 'Active' })).toBeChecked()
    expect(screen.getByRole('columnheader', { name: 'NAV' })).toHaveAttribute('aria-sort', 'ascending')
  })

  it('offers to clear the filter when nothing matches', async () => {
    const fetchMock = serve({ commitments: [] })
    const { user } = renderWithProviders(<CommitmentsTable />, { route: '/?status=pending_close' })

    expect(await screen.findByText('No commitments match this filter.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show all' }))

    await waitFor(() => expect(commitmentRequests(fetchMock)).toContain('/api/commitments?pageSize=10&page=1&sort=dateCommitted&order=desc'))
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()
  })

  it('offers a retry when commitments fail to load', async () => {
    let attempts = 0
    routeFetch(({ path }) => {
      if (path.startsWith('/api/funds')) return jsonResponse(200, makePage(funds))
      attempts += 1
      return attempts === 1 ? jsonResponse(500, { error: 'Internal server error.' }) : jsonResponse(200, makePage([silverpeak]))
    })
    const { user } = renderWithProviders(<CommitmentsTable />)

    expect(await screen.findByText("Couldn't load commitments")).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('row', { name: /Silverpeak/ })).toBeInTheDocument()
  })

  describe('pagination', () => {
    const footerText = () => screen.getByText(/^Showing/).textContent

    it('shows no page controls when everything fits on one page', async () => {
      serve()
      renderWithProviders(<CommitmentsTable />)
      await screen.findByRole('row', { name: /Silverpeak/ })

      expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    })

    it('shows 10 rows at a time and moves between pages', async () => {
      const fetchMock = serve({ commitments: many })
      const { user } = renderWithProviders(<CommitmentsTable />)

      await screen.findByRole('row', { name: /Test Fund 1\b/ })
      expect(screen.getAllByRole('row')).toHaveLength(11) // header + 10
      expect(footerText()).toBe('Showing 1–10 of 25 commitments')
      expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')

      await user.click(screen.getByRole('button', { name: 'Page 2' }))

      await waitFor(() =>
        expect(commitmentRequests(fetchMock)).toContain('/api/commitments?pageSize=10&page=2&sort=dateCommitted&order=desc'),
      )
      expect(await screen.findByRole('row', { name: /Test Fund 11\b/ })).toBeInTheDocument()
      expect(footerText()).toBe('Showing 11–20 of 25 commitments')

      await user.click(screen.getByRole('button', { name: 'Next page' }))

      expect(await screen.findByRole('row', { name: /Test Fund 25\b/ })).toBeInTheDocument()
      expect(footerText()).toBe('Showing 21–25 of 25 commitments')
    })

    it('restores the page from the URL', async () => {
      const fetchMock = serve({ commitments: many })
      renderWithProviders(<CommitmentsTable />, { route: '/?page=3' })

      expect(await screen.findByRole('row', { name: /Test Fund 21\b/ })).toBeInTheDocument()
      expect(commitmentRequests(fetchMock)).toEqual(['/api/commitments?pageSize=10&page=3&sort=dateCommitted&order=desc'])
      expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page')
    })

    it('goes back to page 1 when the filter or sort changes', async () => {
      const fetchMock = serve({ commitments: many })
      const { user } = renderWithProviders(<CommitmentsTable />, { route: '/?page=2' })
      await screen.findByRole('row', { name: /Test Fund 11\b/ })

      await user.click(screen.getByRole('button', { name: 'NAV' }))

      await waitFor(() => expect(commitmentRequests(fetchMock)).toContain('/api/commitments?pageSize=10&page=1&sort=nav&order=desc'))
    })

    it('offers a way back from a page past the end', async () => {
      const fetchMock = serve({ commitments: many })
      const { user } = renderWithProviders(<CommitmentsTable />, { route: '/?page=9' })

      expect(await screen.findByText("There's nothing on page 9.")).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Go to first page' }))

      await waitFor(() =>
        expect(commitmentRequests(fetchMock)).toContain('/api/commitments?pageSize=10&page=1&sort=dateCommitted&order=desc'),
      )
      expect(await screen.findByRole('row', { name: /Test Fund 1\b/ })).toBeInTheDocument()
    })
  })
})
