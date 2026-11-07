import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeHistory, makeOverview } from '../../test/factories.ts'
import { serveApi } from '../../test/fakeApi.ts'
import { jsonResponse, routeFetch } from '../../test/http.ts'
import { renderWithProviders } from '../../test/render.tsx'
import { Headline } from './Headline.tsx'

describe('Headline', () => {
  it('shows a loading state while the totals load', () => {
    routeFetch(() => new Promise<Response>(() => {}))
    renderWithProviders(<Headline />)

    expect(screen.getByLabelText('Loading your totals')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByLabelText('Loading chart')).toBeInTheDocument()
  })

  it('leads with the total value and the all-time change as a pill', async () => {
    serveApi({ overview: makeOverview({ value: 17_333, contributed: 15_450, gain: 1_883, gainPct: 12.2 }) })
    renderWithProviders(<Headline />)

    expect(await screen.findByText('$17,333')).toBeInTheDocument()
    const change = screen.getByRole('img', { name: 'Up $1,883, 12.2% all time' })
    expect(change).toHaveAttribute('data-tone', 'gain')
    expect(change).toHaveTextContent('▲$1,883 · 12.2%')
    expect(screen.getByText('$15,450')).toBeInTheDocument() // in the legend, by "What you put in"
  })

  it('shows a loss in red with a down arrow', async () => {
    serveApi({ overview: makeOverview({ value: 900, contributed: 1_000, gain: -100, gainPct: -10 }) })
    renderWithProviders(<Headline />)

    const change = await screen.findByRole('img', { name: /^Down \$100/ })
    expect(change).toHaveAttribute('data-tone', 'loss')
    expect(change).toHaveTextContent('▼')
  })

  it('describes the chart for screen readers, and changes range', async () => {
    serveApi({ history: makeHistory(24) })
    const { user } = renderWithProviders(<Headline />)

    // 1Y by default: the last 12 of 24 months, Dec 2025 to Nov 2026.
    expect(await screen.findByRole('img', { name: /from \$\d[\d,]* in December 2025 to .* in November 2026/ })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'All' }))

    expect(screen.getByRole('img', { name: /in December 2024 to .* in November 2026/ })).toBeInTheDocument()
  })

  it("shows the scrubbed month's value and gain in the headline, then returns to today", async () => {
    // makeHistory(12): Oct 2026 has $11,000 put in and is worth $12,100.
    serveApi({ overview: makeOverview({ value: 17_333 }), history: makeHistory(12) })
    renderWithProviders(<Headline />)
    const chart = await screen.findByRole('img', { name: /Use the arrow keys/ })

    fireEvent.focus(chart)
    fireEvent.keyDown(chart, { key: 'ArrowLeft' })

    expect(screen.getByText('$12,100')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Up $1,100, 10.0% in Oct 2026' })).toBeInTheDocument()
    expect(screen.getByText('in Oct 2026')).toBeInTheDocument()

    fireEvent.keyDown(chart, { key: 'Escape' })

    expect(screen.getByText('$17,333')).toBeInTheDocument()
    expect(screen.getByText('all time')).toBeInTheDocument()
  })

  it('offers a retry when the totals fail to load', async () => {
    let attempts = 0
    routeFetch(({ path }) => {
      if (path !== '/api/summary') return jsonResponse(200, { data: makeHistory() })
      attempts += 1
      return attempts === 1 ? jsonResponse(500, { error: 'Internal server error.' }) : jsonResponse(200, makeOverview())
    })
    const { user } = renderWithProviders(<Headline />)

    expect(await screen.findByText("Couldn't load your investments")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('$17,333')).toBeInTheDocument()
  })

  it('keeps the totals when only the chart fails', async () => {
    routeFetch(({ path }) => (path === '/api/summary' ? jsonResponse(200, makeOverview()) : jsonResponse(500, { error: 'Internal server error.' })))
    renderWithProviders(<Headline />)

    expect(await screen.findByText("Couldn't load the chart.")).toBeInTheDocument()
    expect(screen.getByText('$17,333')).toBeInTheDocument()
  })
})
