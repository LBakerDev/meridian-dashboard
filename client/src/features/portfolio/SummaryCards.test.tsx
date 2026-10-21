import { screen } from '@testing-library/react'
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

describe('SummaryCards', () => {
  it('shows a loading state while the summary loads', () => {
    routeFetch(() => new Promise<Response>(() => {})) // never resolves
    renderWithProviders(<SummaryCards />)

    expect(screen.getByLabelText('Loading portfolio summary')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows the four headline figures with their context', async () => {
    routeFetch(() => jsonResponse(200, summary))
    renderWithProviders(<SummaryCards />)

    expect(await screen.findByText('$24.3M')).toBeInTheDocument()
    expect(screen.getByText('Net asset value')).toBeInTheDocument()
    expect(screen.getByText('1.31×')).toBeInTheDocument()

    expect(screen.getByText('$39.5M')).toBeInTheDocument()
    expect(screen.getByText('18 active commitments')).toBeInTheDocument()

    expect(screen.getByText('$25M')).toBeInTheDocument()
    expect(screen.getByText(/63% of committed/)).toBeInTheDocument()
    expect(screen.getByText('$14.5M')).toBeInTheDocument()

    expect(screen.getByText('$8.4M')).toBeInTheDocument()
    expect(screen.getByText('0.34×')).toBeInTheDocument()
  })

  it('shows the exact amount on hover', async () => {
    routeFetch(() => jsonResponse(200, summary))
    renderWithProviders(<SummaryCards />)

    expect(await screen.findByText('$24.3M')).toHaveAttribute('title', '$24,300,000')
  })

  it('colors the multiple as a gain at or above 1× and as a loss below', async () => {
    routeFetch(() => jsonResponse(200, makeSummary({ netMoic: 0.96 })))
    renderWithProviders(<SummaryCards />)

    expect(await screen.findByText('0.96×')).toHaveAttribute('data-tone', 'loss')
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

    expect(await screen.findByText('$24.3M')).toBeInTheDocument()
  })
})
