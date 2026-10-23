import type { Commitment, SortOrder } from '../api/types.ts'

/**
 * Whether a commitment has real performance numbers yet.
 *
 * Pending-close commitments aren't valued. Seeded ones come back with null
 * NAV/IRR/MOIC/DPI, but ones created through POST come back with 0s, so this
 * checks the status rather than trusting the numbers.
 */
export function isValued(commitment: Commitment): boolean {
  return commitment.status !== 'pending_close' && commitment.nav !== null
}

/**
 * Orders a page sorted by commit date so same-day commitments follow the same
 * direction. `dateCommitted` has no time, and the API keeps ties in creation
 * order, so "newest first" would list today's commitments oldest first. Ids
 * increase with each new commitment (cm_0021, cm_0022…), so they break the tie.
 */
export function orderByDateCommitted(commitments: Commitment[], order: SortOrder): Commitment[] {
  const direction = order === 'desc' ? -1 : 1
  return [...commitments].sort(
    (a, b) =>
      (a.dateCommitted.localeCompare(b.dateCommitted) || a.id.localeCompare(b.id, 'en', { numeric: true })) * direction,
  )
}

/** Share of the commitment that has been called, 0 to 1. */
export function calledFraction(commitment: Commitment): number {
  return commitment.committed > 0 ? commitment.called / commitment.committed : 0
}
