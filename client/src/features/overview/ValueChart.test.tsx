import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../../test/render.tsx'
import { ValueChart } from './ValueChart.tsx'

const points = [
  { month: '2026-09', contributed: 1_000, value: 1_000 },
  { month: '2026-10', contributed: 2_000, value: 2_100 },
  { month: '2026-11', contributed: 3_000, value: 3_300 },
]

describe('ValueChart', () => {
  it('summarises the chart in one sentence for screen readers', () => {
    renderWithProviders(<ValueChart points={points} />)

    expect(
      screen.getByRole('img', {
        name: 'Value grew from $1,000 in September 2026 to $3,300 in November 2026. You put in $3,000 in total.',
      }),
    ).toBeInTheDocument()
  })

  it('reads out a month from the keyboard, starting at the latest', () => {
    renderWithProviders(<ValueChart points={points} />)
    const chart = screen.getByRole('img')

    fireEvent.focus(chart)
    expect(screen.getByRole('status')).toHaveTextContent('November 2026Value $3,300Put in $3,000+$300')

    fireEvent.keyDown(chart, { key: 'ArrowLeft' })
    expect(screen.getByRole('status')).toHaveTextContent('October 2026')

    fireEvent.keyDown(chart, { key: 'Home' })
    expect(screen.getByRole('status')).toHaveTextContent('September 2026')

    fireEvent.keyDown(chart, { key: 'ArrowLeft' }) // already at the start
    expect(screen.getByRole('status')).toHaveTextContent('September 2026')

    fireEvent.blur(chart)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('says when there is not enough history to draw', () => {
    renderWithProviders(<ValueChart points={points.slice(0, 1)} />)

    expect(screen.getByText('Your chart starts after your first month of deposits.')).toBeInTheDocument()
  })
})
