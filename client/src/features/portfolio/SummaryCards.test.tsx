import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeSummary } from '../../test/factories.ts'
import { jsonResponse, routeFetch } from '../../test/http.ts'
import { renderWithProviders } from '../../test/render.tsx'
import { SummaryCards } from './SummaryCards.tsx'

const summary = makeSummary({
  totalCommitted: 39_500_000,
  totalCalled: 25_000_000,
  totalDistributed: 8_400_000,
  totalNav: 24_300_000,
  unfundedCommitment: 14_500_000,
  netMoic: 1.31,
  netDpi: 0.34,
  activeCommitments: 18,
})

const region = () => screen.getByRole('region', { name: 'Portfolio summary' })

describe('Portfolio summary', () => {
  it('shows a loading state while the summary loads', () => {
    routeFetch(() => new Promise<Response>(() => {})) // never resolves
    renderWithProviders(<SummaryCards />)

    expect(screen.getByLabelText('Loading portfolio summary')).toHaveAttribute('aria-busy', 'true')
  })

  it('leads with total value: NAV plus distributions, and the gain on what was called', async () => {
    routeFetch(() => jsonResponse(200, summary))
    renderWithProviders(<SummaryCards />)

    // 24.3M NAV + 8.4M distributed = 32.7M; minus 25M called = +7.7M
    expect(await screen.findByText('$32.7M')).toHaveAttribute('title', '$32,700,000')
    expect(screen.getByText('+$7.7M')).toHaveAttribute('data-tone', 'gain')
    expect(screen.getByText('1.31×')).toHaveAttribute('data-tone', 'gain')
  })

  it('shows the supporting figures with their context', async () => {
    routeFetch(() => jsonResponse(200, summary))
    renderWithProviders(<SummaryCards />)
    await screen.findByText('$32.7M')

    const panel = within(region())
    expect(panel.getByText('Net asset value')).toBeInTheDocument()
    expect(panel.getByText('$24.3M')).toBeInTheDocument()
    expect(panel.getByText('$8.4M')).toBeInTheDocument()
    expect(panel.getByText('0.34×')).toBeInTheDocument()
    expect(panel.getByText('18 active commitments')).toBeInTheDocument()
    expect(panel.getByText('37% left to be called')).toBeInTheDocument()
  })

  it('shows how much of the commitment has been called', async () => {
    routeFetch(() => jsonResponse(200, summary))
    renderWithProviders(<SummaryCards />)
    await screen.findByText('$32.7M')

    const calledPct = (25 / 39.5) * 100
    expect(screen.getByRole('progressbar', { name: 'Called' })).toHaveAttribute('aria-valuenow', String(calledPct))
    expect(screen.getByRole('progressbar', { name: 'Unfunded' })).toHaveAttribute('aria-valuenow', String(100 - calledPct))
  })

  it('shows a loss in red with a minus sign when total value is below what was called', async () => {
    routeFetch(() => jsonResponse(200, makeSummary({ totalCalled: 10_000_000, totalNav: 8_000_000, totalDistributed: 1_000_000, netMoic: 0.9 })))
    renderWithProviders(<SummaryCards />)

    expect(await screen.findByText('−$1M')).toHaveAttribute('data-tone', 'loss')
    expect(screen.getByText('0.90×')).toHaveAttribute('data-tone', 'loss')
  })

  it('offers a retry when the summary fails to load', async () => {
    let attempts = 0
    routeFetch(() => {
      attempts += 1
      return attempts === 1 ? jsonResponse(500, { error: 'Internal server error.' }) : jsonResponse(200, summary)
    })
    const { user } = renderWithProviders(<SummaryCards />)

    expect(await screen.findByText("Couldn't load your portfolio summary")).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('$32.7M')).toBeInTheDocument()
  })
})
