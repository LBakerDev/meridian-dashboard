import { describe, expect, it } from 'vitest'

import { applyChange, DEFAULT_ACTIVITY_PARAMS, nextSort, parseActivityParams, toSearchParams } from './activityParams.ts'

describe('parseActivityParams', () => {
  it('uses the defaults for an empty URL', () => {
    expect(parseActivityParams(new URLSearchParams())).toEqual(DEFAULT_ACTIVITY_PARAMS)
  })

  it('reads a valid type, sort, order and page', () => {
    expect(parseActivityParams(new URLSearchParams('type=dividend&sort=amount&order=asc&page=3'))).toEqual({
      type: 'dividend',
      sort: 'amount',
      order: 'asc',
      page: 3,
    })
  })

  it('ignores values it does not recognize', () => {
    expect(parseActivityParams(new URLSearchParams('type=transfer&sort=goal&order=sideways&page=0'))).toEqual(DEFAULT_ACTIVITY_PARAMS)
    expect(parseActivityParams(new URLSearchParams('page=1.5')).page).toBe(1)
  })
})

describe('toSearchParams', () => {
  it('leaves defaults out of the URL', () => {
    expect(toSearchParams(DEFAULT_ACTIVITY_PARAMS).toString()).toBe('')
  })

  it('round-trips through parseActivityParams', () => {
    const params = { type: 'fee', sort: 'amount', order: 'asc', page: 2 } as const
    expect(parseActivityParams(toSearchParams(params))).toEqual(params)
  })
})

describe('applyChange', () => {
  const onPage3 = { ...DEFAULT_ACTIVITY_PARAMS, page: 3 }

  it('goes back to page 1 when the filter or sort changes', () => {
    expect(applyChange(onPage3, { type: 'deposit' })).toEqual({ ...DEFAULT_ACTIVITY_PARAMS, type: 'deposit' })
    expect(applyChange(onPage3, { sort: 'amount', order: 'desc' }).page).toBe(1)
  })

  it('keeps the filter and sort when only the page changes', () => {
    const filtered = { ...onPage3, type: 'dividend' as const }
    expect(applyChange(filtered, { page: 4 })).toEqual({ ...filtered, page: 4 })
  })
})

describe('nextSort', () => {
  it('starts a new column largest first, and flips on a second click', () => {
    expect(nextSort(DEFAULT_ACTIVITY_PARAMS, 'amount')).toEqual({ sort: 'amount', order: 'desc' })
    expect(nextSort({ ...DEFAULT_ACTIVITY_PARAMS, sort: 'amount', order: 'desc' }, 'amount')).toEqual({ sort: 'amount', order: 'asc' })
  })
})
