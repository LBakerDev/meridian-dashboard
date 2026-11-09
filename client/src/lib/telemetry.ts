/**
 * What gets measured, kept small on purpose:
 *
 * - Page views and a handful of named events go to GoatCounter (cookie-free, no
 *   personal data), under `meridian/…` in the same dashboard as the portfolio.
 *   The script is loaded in index.html; localhost isn't counted, and neither is a
 *   browser that has opted out (visit the demo with #toggle-goatcounter once).
 * - Uncaught errors in the browser are sent to the server's log, so a bug on a
 *   visitor's device shows up somewhere (Render → Logs, "[client-error]").
 *
 * Both are no-ops in tests and when the script is blocked.
 */

interface GoatCounter {
  count: (vars: { path: string; title?: string; event?: boolean }) => void
}

declare global {
  interface Window {
    goatcounter?: GoatCounter
  }
}

/** The events worth knowing about: does anyone use the demo beyond looking at it? */
export type TrackedEvent =
  | 'goal-created'
  | 'money-added'
  | 'goal-edited'
  | 'goal-deleted'
  | 'goal-closed'
  | 'goals-reordered'
  | 'theme-light'
  | 'theme-dark'
  | 'theme-auto'

export function track(event: TrackedEvent): void {
  try {
    window.goatcounter?.count({ path: `meridian/${event}`, title: event, event: true })
  } catch {
    // Analytics must never break the app.
  }
}

/** Send uncaught errors to the server log. Call once, at startup, in production. */
export function reportErrors(): void {
  let sent = 0
  const send = (message: string, stack?: string) => {
    if (sent >= 5) return // one bad loop shouldn't flood the log
    sent += 1
    try {
      const body = JSON.stringify({ message, stack, url: window.location.pathname })
      const blob = new Blob([body], { type: 'application/json' })
      if (!navigator.sendBeacon?.('/api/client-errors', blob)) {
        void fetch('/api/client-errors', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
      }
    } catch {
      // Reporting is best effort.
    }
  }
  window.addEventListener('error', (event) => send(event.message, event.error instanceof Error ? event.error.stack : undefined))
  window.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason
    send(reason instanceof Error ? reason.message : String(reason), reason instanceof Error ? reason.stack : undefined)
  })
}
