const BASE_URL = '/api'

/**
 * Any failed request. `status` is the HTTP status, or 0 when the server
 * couldn't be reached. `fields` holds per-field validation messages from a 400.
 */
export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

type QueryValue =string | number | boolean | null | undefined

/** Builds "?a=1&b=2", skipping empty values. Returns "" when nothing is set. */
export function buildQuery(params: Record<string, QueryValue> = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  signal?: AbortSignal
}

function isErrorBody(value: unknown): value is { error?: string; fields?: Record<string, string> } {
  return typeof value === 'object' && value !== null
}

export async function request<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(BASE_URL + path, {
      method,
      signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    // Let cancellations through untouched so TanStack Query can ignore them.
    // Checked by name: `instanceof DOMException` isn't reliable across environments.
    if ((error as { name?: string } | null)?.name === 'AbortError') throw error
    throw new ApiError("Couldn't reach the server.", 0)
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const errorBody = isErrorBody(payload) ? payload : {}
    throw new ApiError(
      errorBody.error ?? `Request failed (${response.status}).`,
      response.status,
      errorBody.fields ?? {},
    )
  }

  return payload as T
}
