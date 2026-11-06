import type { ActivitySortField, ActivityType, SortOrder } from '../../api/types.ts'

/**
 * The activity table's filter, sort and page live in the URL
 * (?type=dividend&sort=amount&order=asc&page=2), so they survive a refresh and
 * can be shared. These functions are the only place that reads or writes them.
 */

export const PAGE_SIZE = 10

export interface ActivityParams {
  type: ActivityType | null
  sort: ActivitySortField
  order: SortOrder
  page: number
}

export const DEFAULT_ACTIVITY_PARAMS: ActivityParams = { type: null, sort: 'date', order: 'desc', page: 1 }

const TYPES: readonly ActivityType[] = ['deposit', 'dividend', 'fee']
const SORT_FIELDS: readonly ActivitySortField[] = ['date', 'amount']

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.includes(value as T) ? (value as T) : null
}

function positiveInt(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null
  const n = Number(value)
  return n >= 1 ? n : null
}

/** Reads params from the URL. Anything missing or unrecognized falls back to the default. */
export function parseActivityParams(search: URLSearchParams): ActivityParams {
  return {
    type: oneOf(search.get('type'), TYPES),
    sort: oneOf(search.get('sort'), SORT_FIELDS) ?? DEFAULT_ACTIVITY_PARAMS.sort,
    order: oneOf(search.get('order'), ['asc', 'desc'] as const) ?? DEFAULT_ACTIVITY_PARAMS.order,
    page: positiveInt(search.get('page')) ?? DEFAULT_ACTIVITY_PARAMS.page,
  }
}

/** Writes params to the URL, leaving out defaults so the plain page URL stays plain. */
export function toSearchParams(params: ActivityParams): URLSearchParams {
  const search = new URLSearchParams()
  if (params.type) search.set('type', params.type)
  if (params.sort !== DEFAULT_ACTIVITY_PARAMS.sort || params.order !== DEFAULT_ACTIVITY_PARAMS.order) {
    search.set('sort', params.sort)
    search.set('order', params.order)
  }
  if (params.page !== DEFAULT_ACTIVITY_PARAMS.page) search.set('page', String(params.page))
  return search
}

/** Applies a change. A new filter or sort goes back to page 1; only a page change keeps the page. */
export function applyChange(current: ActivityParams, patch: Partial<ActivityParams>): ActivityParams {
  return { ...current, page: 1, ...patch }
}

/** Clicking a column: the same column flips direction; a new column starts largest/newest first. */
export function nextSort(current: ActivityParams, field: ActivitySortField): Pick<ActivityParams, 'sort' | 'order'> {
  if (current.sort === field) return { sort: field, order: current.order === 'desc' ? 'asc' : 'desc' }
  return { sort: field, order: 'desc' }
}
