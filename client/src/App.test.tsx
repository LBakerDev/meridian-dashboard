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
  it('shows your investments at /', () => {
    renderWithProviders(<App />, { route: '/' })

    expect(screen.getByRole('heading', { level: 1, name: 'Your investments' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Meridian' })).toHaveAttribute('href', '/')
    expect(document.title).toBe('Your investments · Meridian')
  })

  it('opens the New goal drawer', async () => {
    const { user } = renderWithProviders(<App />)

    await user.click(screen.getByRole('button', { name: 'New goal' }))

    expect(await screen.findByRole('dialog', { name: 'New goal' })).toBeInTheDocument()
  })

  it('switches between light and dark mode and remembers the choice', async () => {
    const { user } = renderWithProviders(<App />)

    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }))

    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'dark')
    expect(localStorage.getItem('mantine-color-scheme-value')).toBe('dark')

    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }))

    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'light')
  })

  it('shows a not-found page with a way back for unknown addresses', async () => {
    const { user } = renderWithProviders(<App />, { route: '/funds' })

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Back to your investments' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Your investments' })).toBeInTheDocument()
  })

  it('offers a skip link to the main content', () => {
    renderWithProviders(<App />)

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })
})
