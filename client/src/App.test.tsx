import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App.tsx'
import { routeFetch } from './test/http.ts'
import { renderWithProviders } from './test/render.tsx'

// These tests cover the shell and routing, not data: leave every request pending.
beforeEach(() => {
  routeFetch(() => new Promise<Response>(() => {}))
})

describe('App shell and routing', () => {
  it('shows the portfolio at /', () => {
    renderWithProviders(<App />, { route: '/' })

    expect(screen.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Meridian' })).toHaveAttribute('href', '/')
    expect(document.title).toBe('Portfolio · Meridian')
  })

  it('opens the commit drawer from the portfolio', async () => {
    const { user } = renderWithProviders(<App />, { route: '/' })

    await user.click(screen.getByRole('button', { name: 'Commit capital' }))

    expect(await screen.findByRole('dialog', { name: 'Commit capital' })).toBeInTheDocument()
  })

  it('shows a not-found page with a way back for unknown addresses', async () => {
    const { user } = renderWithProviders(<App />, { route: '/funds' })

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Back to portfolio' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeInTheDocument()
  })

  it('offers a skip link to the main content', () => {
    renderWithProviders(<App />)

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })
})
