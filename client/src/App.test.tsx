import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App.tsx'
import { routeFetch } from './test/http.ts'
import { renderWithProviders } from './test/render.tsx'

// These tests cover the shell and routing, not data: leave every request pending.
beforeEach(() => {
  routeFetch(() => new Promise<Response>(() => {}))
})

function navLink(name: string) {
  return screen.getByRole('link', { name })
}

describe('App shell and routing', () => {
  it('shows the portfolio at / and marks it as the current page', () => {
    renderWithProviders(<App />, { route: '/' })

    expect(screen.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeInTheDocument()
    expect(navLink('Portfolio')).toHaveAttribute('aria-current', 'page')
    expect(navLink('Open funds')).not.toHaveAttribute('aria-current')
    expect(document.title).toBe('Portfolio · Meridian')
  })

  it('shows open funds at /funds and marks that link instead', () => {
    renderWithProviders(<App />, { route: '/funds' })

    expect(screen.getByRole('heading', { level: 1, name: 'Open funds' })).toBeInTheDocument()
    expect(navLink('Open funds')).toHaveAttribute('aria-current', 'page')
    expect(navLink('Portfolio')).not.toHaveAttribute('aria-current')
  })

  it('navigates between sections from the header', async () => {
    const { user } = renderWithProviders(<App />, { route: '/' })

    await user.click(navLink('Open funds'))

    expect(screen.getByRole('heading', { level: 1, name: 'Open funds' })).toBeInTheDocument()
    expect(navLink('Open funds')).toHaveAttribute('aria-current', 'page')
    expect(document.title).toBe('Open funds · Meridian')
  })

  it('shows a not-found page with a way back for unknown addresses', async () => {
    const { user } = renderWithProviders(<App />, { route: '/nope' })

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
