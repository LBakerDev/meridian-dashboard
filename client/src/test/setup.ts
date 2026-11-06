import '@testing-library/jest-dom/vitest'
import { notifications } from '@mantine/notifications'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  notifications.clean() // the toast store is global; don't let one test's toasts leak into the next
  localStorage.clear() // e.g. a saved color scheme
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// jsdom lacks these browser APIs; Mantine components rely on them.
// Tests run as if the user prefers reduced motion: count-ups and drawer transitions
// finish instantly, so tests check end states without waiting on animations.
// useCountUp.test.ts switches motion back on to test the animation itself.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverStub
