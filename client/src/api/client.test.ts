import { describe, expect, it } from 'vitest'
import { jsonResponse, mockFetch } from '../test/http.ts'
import { ApiError, buildQuery, isApiError, request } from './client.ts'

describe('buildQuery', () => {
  it('returns an empty string when there are no params', () => {
    expect(buildQuery()).toBe('')
    expect(buildQuery({})).toBe('')
  })

  it('skips undefined, null and empty values', () => {
    expect(buildQuery({ status: undefined, fundId: null, q: '', page: 2 })).toBe('?page=2')
  })

  it('encodes values', () => {
    expect(buildQuery({ q: 'Hollowell & Co.' })).toBe('?q=Hollowell+%26+Co.')
  })
})

describe('request', () => {
  it('prefixes the path with /api and returns the parsed body', async () => {
    const fetchMock = mockFetch(jsonResponse(200, { status: 'ok' }))

    await expect(request('/health')).resolves.toEqual({ status: 'ok' })
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.objectContaining({ method: 'GET' }))
  })

  it('sends a JSON body with a content-type header on POST', async () => {
    const fetchMock = mockFetch(jsonResponse(201, { id: 'cm_0021' }))

    await request('/funds/fund_x/commitments', { method: 'POST', body: { amount: 250000, acknowledgedTerms: true } })

    const [, init] = fetchMock.mock.calls[0]
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init?.body).toBe(JSON.stringify({ amount: 250000, acknowledgedTerms: true }))
  })

  it('throws an ApiError with field messages on a 400', async () => {
    mockFetch(
      jsonResponse(400, {
        error: 'Please correct the highlighted fields.',
        fields: { amount: 'Minimum commitment for this fund is $250,000.' },
      }),
    )

    const error = await request('/funds/fund_x/commitments', { method: 'POST', body: {} }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      message: 'Please correct the highlighted fields.',
      fields: { amount: 'Minimum commitment for this fund is $250,000.' },
    })
  })

  it('keeps the server message on a 409', async () => {
    mockFetch(jsonResponse(409, { error: 'Silverpeak Growth Equity V is closed to new commitments.' }))

    const error = await request('/funds/fund_silverpeak_v/commitments', { method: 'POST', body: {} }).catch((e) => e)

    expect(error).toMatchObject({ status: 409, message: 'Silverpeak Growth Equity V is closed to new commitments.', fields: {} })
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    mockFetch(new Response('Bad Gateway', { status: 502 }))

    await expect(request('/portfolio/summary')).rejects.toMatchObject({ status: 502, message: 'Request failed (502).' })
  })

  it('reports a network failure as status 0', async () => {
    mockFetch(new TypeError('Failed to fetch'))

    const error: unknown = await request('/portfolio/summary').catch((e: unknown) => e)

    expect(isApiError(error)).toBe(true)
    expect(error).toMatchObject({ status: 0, isNetworkError: true })
  })

  it('rethrows aborts untouched so cancelled queries are ignored', async () => {
    mockFetch(new DOMException('The operation was aborted.', 'AbortError'))

    await expect(request('/portfolio/summary')).rejects.toMatchObject({ name: 'AbortError' })
  })
})
