import { describe, expect, it } from 'vitest'

import { applyChange, DEFAULT_TABLE_PARAMS, nextSort, parseTableParams, toSearchParams } from './tableParams.ts'

describe('parseTableParams', () => {
  it('uses the defaults for an empty URL', () => {
    expect(parseTableParams(new URLSearchParams())).toEqual(DEFAULT_TABLE_PARAMS)
  })

  it('reads a valid status, sort, order and page', () => {
    expect(parseTableParams(new URLSearchParams('status=pending_close&sort=nav&order=asc&page=3'))).toEqual({
      status: 'pending_close',
      sort: 'nav',
      order: 'asc',
      page: 3,
    })
  })

  it('ignores values it does not recognize', () => {
    expect(parseTableParams(new URLSearchParams('status=closed&sort=fundName&order=sideways&page=0'))).toEqual(
      DEFAULT_TABLE_PARAMS,
    )
    expect(parseTableParams(new URLSearchParams('page=-2')).page).toBe(1)
    expect(parseTableParams(new URLSearchParams('page=1.5')).page).toBe(1)
  })
})

describe('toSearchParams', () => {
  it('leaves defaults out of the URL', () => {
    expect(toSearchParams(DEFAULT_TABLE_PARAMS).toString()).toBe('')
  })

  it('writes a filter, a non-default sort and a page', () => {
    expect(toSearchParams({ status: 'active', sort: 'netIrrPct', order: 'desc', page: 2 }).toString()).toBe(
      'status=active&sort=netIrrPct&order=desc&page=2',
    )
  })

  it('round-trips through parseTableParams', () => {
    const params = { status: 'pending_close', sort: 'called', order: 'asc', page: 4 } as const
    expect(parseTableParams(toSearchParams(params))).toEqual(params)
  })
})

describe('applyChange', () => {
  const onPage3 = { ...DEFAULT_TABLE_PARAMS, page: 3 }

  it('goes back to page 1 when the filter or sort changes', () => {
    expect(applyChange(onPage3, { status: 'active' })).toEqual({ ...DEFAULT_TABLE_PARAMS, status: 'active' })
    expect(applyChange(onPage3, { sort: 'nav', order: 'desc' }).page).toBe(1)
  })

  it('keeps the filter and sort when only the page changes', () => {
    const filtered = { ...onPage3, status: 'active' as const, sort: 'nav' as const }
    expect(applyChange(filtered, { page: 4 })).toEqual({ ...filtered, page: 4 })
  })
})

describe('nextSort', () => {
  it('starts a new column largest-first', () => {
    expect(nextSort(DEFAULT_TABLE_PARAMS, 'nav')).toEqual({ sort: 'nav', order: 'desc' })
  })

  it('flips the direction when the same column is clicked again', () => {
    expect(nextSort({ ...DEFAULT_TABLE_PARAMS, sort: 'nav', order: 'desc' }, 'nav')).toEqual({ sort: 'nav', order: 'asc' })
    expect(nextSort({ ...DEFAULT_TABLE_PARAMS, sort: 'nav', order: 'asc' }, 'nav')).toEqual({ sort: 'nav', order: 'desc' })
  })
})
