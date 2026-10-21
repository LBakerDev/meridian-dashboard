import { screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { makeCommitment, makeFund, makePage } from '../../test/factories.ts'
import { jsonResponse, routeFetch } from '../../test/http.ts'
import { renderWithProviders } from '../../test/render.tsx'
import { CommitDrawer } from './CommitDrawer.tsx'

const northwind = makeFund({ closeDate: '2099-12-15' })
const pinecrest = makeFund({ id: 'fund_pinecrest_ii', name: 'Pinecrest Ventures II', manager: 'Pinecrest', closeDate: '2099-03-31' })

function serve() {
  routeFetch(({ method, path }) => {
    if (method === 'POST') return jsonResponse(201, makeCommitment({ fundId: pinecrest.id, status: 'pending_close' }))
    return path.startsWith('/api/funds') ? jsonResponse(200, makePage([northwind, pinecrest])) : jsonResponse(200, makePage([]))
  })
}

/** The drawer plus an Open button, as PortfolioPage uses it. */
function Harness() {
  const [opened, setOpened] = useState(false)
  return (
    <>
      <button onClick={() => setOpened(true)}>Open</button>
      <CommitDrawer opened={opened} onClose={() => setOpened(false)} />
    </>
  )
}

describe('CommitDrawer', () => {
  it('moves from picking a fund to that fund, and back', async () => {
    serve()
    const { user } = renderWithProviders(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    await user.click(await screen.findByRole('button', { name: /Pinecrest Ventures II/ }))

    expect(screen.getByRole('heading', { name: 'Pinecrest Ventures II' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Funds accepting commitments' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '← Change fund' }))

    expect(screen.getByRole('list', { name: 'Funds accepting commitments' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pinecrest Ventures II/ })).toHaveAttribute('data-selected')
  })

  it('closes after a successful commit', async () => {
    serve()
    const { user } = renderWithProviders(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(await screen.findByRole('button', { name: /Pinecrest Ventures II/ }))

    await user.type(screen.getByLabelText('Commitment amount'), '300000')
    await user.click(screen.getByRole('checkbox', { name: "I've read and accept the fund terms" }))
    await user.click(screen.getByRole('button', { name: 'Commit $300,000' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Commit capital' })).not.toBeInTheDocument())
    expect(screen.getByText('Commitment submitted')).toBeInTheDocument()
  })

  it('starts over at the fund list each time it opens', async () => {
    serve()
    const { user } = renderWithProviders(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(await screen.findByRole('button', { name: /Pinecrest Ventures II/ }))

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(await screen.findByRole('list', { name: 'Funds accepting commitments' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pinecrest Ventures II' })).not.toBeInTheDocument()
  })
})
