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

  it('shows the account, and switches between light, dark and system themes', async () => {
    const { user } = renderWithProviders(<App />)

    await user.click(screen.getByRole('button', { name: 'Account menu for London Baker' }))
    expect(await screen.findByText('Sample account · demo data')).toBeInTheDocument()
    expect(screen.getByText('Chase ••4821')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'dark')
    expect(localStorage.getItem('mantine-color-scheme-value')).toBe('dark')

    // System follows the device; the test environment reports a light preference.
    await user.click(screen.getByRole('radio', { name: 'System' }))
    expect(localStorage.getItem('mantine-color-scheme-value')).toBe('auto')
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
