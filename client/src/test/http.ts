import { vi } from 'vitest'

/** A JSON Response, as the API would return it. */
export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export interface FetchCall {
  method: string
  /** Path including the query string, e.g. "/api/activity?type=dividend&page=2" */
  path: string
  body: unknown
}

/**
 * Replaces global fetch with a handler that routes by method and path. Use when a
 * test makes several requests whose order isn't fixed (e.g. hooks refetching).
 */
export function routeFetch(handler: (call: FetchCall) => Response | Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    return handler({ method: init?.method ?? 'GET', path, body })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** A promise you resolve by hand, for holding a request open mid-test. */
export function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

/** Replaces global fetch with a mock. Reset automatically after each test (see setup.ts). */
export function mockFetch(...responses: Array<Response | Error | DOMException>) {
  const fetchMock = vi.fn<typeof fetch>()
  for (const response of responses) {
    // Anything that isn't a Response is thrown. (jsdom's DOMException isn't an `instanceof Error`.)
    if (response instanceof Response) fetchMock.mockResolvedValueOnce(response)
    else fetchMock.mockRejectedValueOnce(response)
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
