import type { CommitmentSortField, CommitmentStatus, SortOrder } from '../../api/types.ts'

/**
 * The commitments table's filter, sort and page live in the URL
 * (?status=pending_close&sort=nav&order=desc&page=2), so they survive a refresh
 * and can be shared. These functions are the only place that reads or writes them.
 */

export const PAGE_SIZE = 10

export interface TableParams {
  status: CommitmentStatus | null
  sort: CommitmentSortField
  order: SortOrder
  page: number
}

export const DEFAULT_TABLE_PARAMS: TableParams = { status: null, sort: 'dateCommitted', order: 'desc', page: 1 }

const STATUSES: readonly CommitmentStatus[] = ['active', 'pending_close']
const SORT_FIELDS: readonly CommitmentSortField[] = [
  'dateCommitted',
  'committed',
  'called',
  'distributed',
  'nav',
  'netIrrPct',
  'netMoic',
]

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.includes(value as T) ? (value as T) : null
}

function positiveInt(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null
  const n = Number(value)
  return n >= 1 ? n : null
}

/** Reads params from the URL. Anything missing or unrecognized falls back to the default. */
export function parseTableParams(search: URLSearchParams): TableParams {
  return {
    status: oneOf(search.get('status'), STATUSES),
    sort: oneOf(search.get('sort'), SORT_FIELDS) ?? DEFAULT_TABLE_PARAMS.sort,
    order: oneOf(search.get('order'), ['asc', 'desc'] as const) ?? DEFAULT_TABLE_PARAMS.order,
    page: positiveInt(search.get('page')) ?? DEFAULT_TABLE_PARAMS.page,
  }
}

/** Writes params to the URL, leaving out defaults so the plain page URL stays plain. */
export function toSearchParams(params: TableParams): URLSearchParams {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.sort !== DEFAULT_TABLE_PARAMS.sort || params.order !== DEFAULT_TABLE_PARAMS.order) {
    search.set('sort', params.sort)
    search.set('order', params.order)
  }
  if (params.page !== DEFAULT_TABLE_PARAMS.page) search.set('page', String(params.page))
  return search
}

/**
 * Applies a change. Anything other than a page change (a new filter or sort)
 * goes back to page 1, since the old page number no longer means anything.
 */
export function applyChange(current: TableParams, patch: Partial<TableParams>): TableParams {
  return { ...current, page: 1, ...patch }
}

/** Clicking a column: the same column flips direction; a new column starts largest-first. */
export function nextSort(current: TableParams, field: CommitmentSortField): Pick<TableParams, 'sort' | 'order'> {
  if (current.sort === field) return { sort: field, order: current.order === 'desc' ? 'asc' : 'desc' }
  return { sort: field, order: 'desc' }
}
