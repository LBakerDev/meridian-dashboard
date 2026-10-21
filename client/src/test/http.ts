import { vi } from 'vitest'

/** A JSON Response, as the API would return it. */
export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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
