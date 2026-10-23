import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { COUNT_UP_MS, useCountUp } from './useCountUp.ts'

/** The test setup prefers reduced motion; these tests switch motion back on where needed. */
function allowMotion() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  )
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    return () => vi.useRealTimers()
  })

  it('counts up from zero on first render', () => {
    allowMotion()
    const { result } = renderHook(() => useCountUp(1_000_000))

    expect(result.current).toBe(0)

    advance(COUNT_UP_MS / 2)
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(1_000_000)

    advance(COUNT_UP_MS)
    expect(result.current).toBe(1_000_000)
  })

  it('counts from the old value to the new one when the target changes', () => {
    allowMotion()
    const { result, rerender } = renderHook(({ target }) => useCountUp(target), { initialProps: { target: 40_000_000 } })
    advance(COUNT_UP_MS * 2)

    rerender({ target: 40_300_000 })
    expect(result.current).toBe(40_000_000) // starts where it was, not from zero

    advance(COUNT_UP_MS / 2)
    expect(result.current).toBeGreaterThan(40_000_000)
    expect(result.current).toBeLessThan(40_300_000)

    advance(COUNT_UP_MS)
    expect(result.current).toBe(40_300_000)
  })

  it('carries on from the shown value if interrupted', () => {
    allowMotion()
    const { result, rerender } = renderHook(({ target }) => useCountUp(target), { initialProps: { target: 100 } })
    advance(COUNT_UP_MS / 2)
    const midway = result.current

    rerender({ target: 200 })
    expect(result.current).toBe(midway)

    advance(COUNT_UP_MS * 2)
    expect(result.current).toBe(200)
  })

  it('shows the final value at once for people who prefer reduced motion', () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target), { initialProps: { target: 1_000_000 } })
    expect(result.current).toBe(1_000_000)

    rerender({ target: 2_000_000 })
    expect(result.current).toBe(2_000_000)
  })
})
