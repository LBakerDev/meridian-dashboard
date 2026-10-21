import type { Commitment } from '../api/types.ts'

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

/** Share of the commitment that has been called, 0 to 1. */
export function calledFraction(commitment: Commitment): number {
  return commitment.committed > 0 ? commitment.called / commitment.committed : 0
}
