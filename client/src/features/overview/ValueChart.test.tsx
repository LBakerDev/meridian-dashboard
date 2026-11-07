import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../test/render.tsx'
import { ValueChart } from './ValueChart.tsx'

const points = [
  { month: '2026-09', contributed: 1_000, value: 1_000 },
  { month: '2026-10', contributed: 2_000, value: 2_100 },
  { month: '2026-11', contributed: 3_000, value: 3_300 },
]

const chart = () => screen.getByRole('img', { name: /^Value grew/ })

describe('ValueChart', () => {
  it('summarises the chart in one sentence, and says how to explore it', () => {
    renderWithProviders(<ValueChart points={points} />)

    expect(chart()).toHaveAccessibleName(
      'Value grew from $1,000 in September 2026 to $3,300 in November 2026. You put in $3,000 in total. Use the arrow keys to read a month.',
    )
  })

  it('scrubs months from the keyboard, starting at the latest, and reports each one', () => {
    const onScrub = vi.fn()
    renderWithProviders(<ValueChart points={points} onScrub={onScrub} />)

    fireEvent.focus(chart())
    expect(onScrub).toHaveBeenLastCalledWith(points[2])
    expect(screen.getByText('Nov 2026')).toBeInTheDocument() // the pill on the guide line

    fireEvent.keyDown(chart(), { key: 'ArrowLeft' })
    expect(onScrub).toHaveBeenLastCalledWith(points[1])
    expect(screen.getByText('Oct 2026')).toBeInTheDocument()

    fireEvent.keyDown(chart(), { key: 'Home' })
    fireEvent.keyDown(chart(), { key: 'ArrowLeft' }) // already at the start
    expect(onScrub).toHaveBeenLastCalledWith(points[0])

    fireEvent.keyDown(chart(), { key: 'Escape' })
    expect(onScrub).toHaveBeenLastCalledWith(null)
    expect(screen.queryByTestId('scrubber')).not.toBeInTheDocument()
  })

  it('reads the month out to screen readers when scrubbing from the keyboard', () => {
    renderWithProviders(<ValueChart points={points} />)

    fireEvent.focus(chart())
    fireEvent.keyDown(chart(), { key: 'ArrowLeft' })

    expect(screen.getByRole('status')).toHaveTextContent('October 2026: value $2,100, put in $2,000, +$100.')
  })

  it('follows the mouse, and lets go when it leaves', () => {
    const onScrub = vi.fn()
    renderWithProviders(<ValueChart points={points} onScrub={onScrub} />)

    fireEvent.mouseMove(chart(), { clientX: 10 })
    expect(onScrub).toHaveBeenLastCalledWith(expect.objectContaining({ month: expect.any(String) }))
    expect(screen.getByTestId('scrubber')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement() // mouse movement isn't read out

    fireEvent.mouseLeave(chart())
    expect(onScrub).toHaveBeenLastCalledWith(null)
    expect(screen.queryByTestId('scrubber')).not.toBeInTheDocument()
  })

  it('says when there is not enough history to draw', () => {
    renderWithProviders(<ValueChart points={points.slice(0, 1)} />)

    expect(screen.getByText('Your chart starts after your first month of deposits.')).toBeInTheDocument()
  })
})
