import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeCommitment, makeFund, makePage } from '../../test/factories.ts'
import { jsonResponse, routeFetch } from '../../test/http.ts'
import { renderWithProviders } from '../../test/render.tsx'
import { CurrencyNote } from './CurrencyNote.tsx'

const funds = [
  makeFund({ id: 'fund_usd', currency: 'USD' }),
  makeFund({ id: 'fund_eur_a', currency: 'EUR' }),
  makeFund({ id: 'fund_eur_b', currency: 'EUR' }),
]

function serve(commitments: ReturnType<typeof makeCommitment>[]) {
  return routeFetch(({ path }) =>
    path.startsWith('/api/funds') ? jsonResponse(200, makePage(funds)) : jsonResponse(200, makePage(commitments)),
  )
}

describe('CurrencyNote', () => {
  it('flags EUR commitments that the USD totals include without conversion', async () => {
    serve([
      makeCommitment({ id: 'cm_1', fundId: 'fund_usd' }),
      makeCommitment({ id: 'cm_2', fundId: 'fund_eur_a' }),
      makeCommitment({ id: 'cm_3', fundId: 'fund_eur_b' }),
    ])
    renderWithProviders(<CurrencyNote />)

    expect(await screen.findByText(/include 2 EUR commitments added without currency conversion/)).toBeInTheDocument()
  })

  it('says nothing when every commitment is in USD', async () => {
    serve([makeCommitment({ fundId: 'fund_usd' })])
    const { queryClient } = renderWithProviders(<CurrencyNote />)

    // Wait until both lists have loaded, so "nothing shown" isn't just "still loading".
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    await waitFor(() => expect(queryClient.getQueryCache().getAll().every((q) => q.state.status === 'success')).toBe(true))

    // (The container itself isn't empty: MantineProvider injects <style> tags into it.)
    expect(screen.queryByText(/without currency conversion/)).not.toBeInTheDocument()
  })
})
