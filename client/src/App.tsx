import { useEffect, useState } from 'react'

/**
 * Starting point for the Meridian front-end take-home.
 *
 * This is deliberately minimal. The one `fetch` below calls `GET /api/health`
 * just to confirm the dev proxy to the API (http://localhost:4000) is working —
 * feel free to delete it. Build the dashboard described in the README from here.
 *
 * The API base path is `/api` (e.g. `/api/portfolio/summary`). In dev, Vite
 * proxies `/api` to the running API server (see vite.config.ts).
 */
function App() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'unreachable'>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? setApiStatus('ok') : setApiStatus('unreachable')))
      .catch(() => setApiStatus('unreachable'))
  }, [])

  return (
    <main className="app">
      <h1>Meridian</h1>
      <p className="subtitle">Portfolio dashboard — front-end take-home</p>

      <p className={`api-status api-status--${apiStatus}`}>
        {apiStatus === 'checking' && 'Checking API connection…'}
        {apiStatus === 'ok' && 'API connected (GET /api/health).'}
        {apiStatus === 'unreachable' &&
          'API unreachable. Start it from the repo root with `npm start`.'}
      </p>

      <p className="hint">
        Edit <code>src/App.tsx</code> to get started. See the README for the brief.
      </p>
    </main>
  )
}

export default App
