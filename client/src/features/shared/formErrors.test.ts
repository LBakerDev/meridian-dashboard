import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../api/client.ts'
import { toFormProblem } from './formErrors.tsx'

const recover = { label: 'Choose another portfolio', onClick: () => {} }

describe('toFormProblem', () => {
  it('puts 400 field errors under the fields it knows, and shows no alert', () => {
    const setFieldErrors = vi.fn()
    const error = new ApiError('Please correct the highlighted fields.', 400, { amount: 'Too small.', other: 'Ignored.' })

    expect(toFormProblem(error, { fields: ['amount'], setFieldErrors })).toBeNull()
    expect(setFieldErrors).toHaveBeenCalledWith({ amount: 'Too small.' })
  })

  it("falls back to an alert when a 400 names no field the form shows", () => {
    const problem = toFormProblem(new ApiError('Bad request.', 400, { other: 'x' }), { fields: ['amount'], setFieldErrors: vi.fn() })
    expect(problem).toMatchObject({ title: 'Something went wrong' })
  })

  it('offers a way back when the thing is gone (404) or closed (409)', () => {
    for (const status of [404, 409]) {
      const problem = toFormProblem(new ApiError('Core Growth is no longer open to new goals.', status), {
        fields: [],
        setFieldErrors: vi.fn(),
        gone: { title: 'This portfolio is no longer available', recover },
      })
      expect(problem).toEqual({ title: 'This portfolio is no longer available', message: 'Core Growth is no longer open to new goals.', recover })
    }
  })

  it('says nothing was sent when the server can’t be reached', () => {
    const problem = toFormProblem(new ApiError("Couldn't reach the server.", 0), { fields: [], setFieldErrors: vi.fn() })
    expect(problem).toMatchObject({ title: "Couldn't reach the server", message: expect.stringContaining('Nothing was sent') })
  })

  it('handles errors that aren’t from the API', () => {
    expect(toFormProblem(new Error('boom'), { fields: [], setFieldErrors: vi.fn() })).toMatchObject({ title: 'Something went wrong' })
  })
})
