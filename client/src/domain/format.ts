/**
 * Display formatting. Pure functions over Intl, with formatters cached because
 * tables call these once per cell.
 */

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat('en-US', options)
    formatters.set(key, f)
  }
  return f
}

/** "$17,333" (whole dollars; balances can carry stray cents). */
export function formatMoney(amount: number, currency = 'USD'): string {
  return formatter(`full:${currency}`, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

/** "19.4%", "−3.1%" */
export function formatPercent(value: number): string {
  return formatter('pct', { maximumFractionDigits: 1, minimumFractionDigits: 1, signDisplay: 'negative' })
    .format(value)
    .replace('-', '−') + '%'
}

/** Parse a YYYY-MM-DD date as a local calendar date (not UTC midnight). */
export function parseDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "Oct 2028" */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/** "Dec 1" (current year) or "Dec 1, 2027" (any other year). */
export function formatShortDate(isoDate: string, today: Date = new Date()): string {
  const date = parseDate(isoDate)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  })
}

/** "$1,883", "−$12.40". Whole dollars unless there are cents. True minus sign. */
export function formatSignedMoney(amount: number): string {
  const abs = Math.abs(amount)
  const text = formatter(Number.isInteger(abs) ? 'signed:0' : 'signed:2', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(abs)
  return amount < 0 ? `−${text}` : amount > 0 ? `+${text}` : text
}

/** "Sep 12, 2022" */
export function formatDate(isoDate: string): string {
  return parseDate(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
