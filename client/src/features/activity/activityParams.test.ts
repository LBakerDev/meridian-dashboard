import { describe, expect, it } from 'vitest'

import { DEFAULT_ACTIVITY_PARAMS, parseActivityParams, toSearchParams } from './activityParams.ts'

const parse = (query: string) => parseActivityParams(new URLSearchParams(query))

describe('activity params', () => {
  it('reads the type and goal from the URL', () => {
    expect(parse('type=withdrawal&goal=goal_0002')).toEqual({ type: 'withdrawal', goalId: 'goal_0002' })
  })

  it('falls back to everything for missing or unrecognized values', () => {
    expect(parse('')).toEqual(DEFAULT_ACTIVITY_PARAMS)
    expect(parse('type=refund&goal=../etc')).toEqual(DEFAULT_ACTIVITY_PARAMS)
  })

  it('leaves defaults out of the URL', () => {
    expect(toSearchParams(DEFAULT_ACTIVITY_PARAMS).toString()).toBe('')
    expect(toSearchParams({ type: 'dividend', goalId: 'goal_0002' }).toString()).toBe('type=dividend&goal=goal_0002')
  })

  it('round-trips', () => {
    const params = { type: 'fee' as const, goalId: null }
    expect(parseActivityParams(toSearchParams(params))).toEqual(params)
  })
})
