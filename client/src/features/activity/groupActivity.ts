import type { Activity } from '../../api/types.ts'

/** One line in the feed: a single entry, or a day's monthly deposits combined. */
export type FeedItem =
  | { kind: 'entry'; entry: Activity }
  | { kind: 'monthly'; key: string; entries: Activity[]; total: number }

export interface FeedDay {
  date: string
  items: FeedItem[]
}

/**
 * Groups activity (newest first, as the API sends it) into days. On each day,
 * two or more scheduled monthly deposits become one line, listed first.
 *
 * The feed loads a page at a time, so the oldest day on screen may continue on
 * the next page. Until the last page is in (`complete`), that day is held back,
 * so a monthly total never shows a partial sum.
 */
export function groupActivity(rows: Activity[], { complete }: { complete: boolean }): FeedDay[] {
  const byDate: { date: string; rows: Activity[] }[] = []
  for (const row of rows) {
    const last = byDate.at(-1)
    if (last?.date === row.date) last.rows.push(row)
    else byDate.push({ date: row.date, rows: [row] })
  }
  if (!complete && byDate.length > 1) byDate.pop()

  return byDate.map(({ date, rows: dayRows }) => {
    const monthly = dayRows.filter((a) => a.type === 'deposit' && a.recurring)
    const others = dayRows.filter((a) => !(a.type === 'deposit' && a.recurring))
    const items: FeedItem[] =
      monthly.length > 1
        ? [{ kind: 'monthly', key: `monthly-${date}`, entries: monthly, total: monthly.reduce((sum, a) => sum + a.amount, 0) }]
        : monthly.map((entry) => ({ kind: 'entry', entry }))
    return { date, items: [...items, ...others.map((entry): FeedItem => ({ kind: 'entry', entry }))] }
  })
}
