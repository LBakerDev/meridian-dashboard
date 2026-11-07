import { describe, expect, it } from 'vitest'
import { formatDate, formatDay, formatMoney, formatMonthYear, formatPercent, formatShortDate, formatSignedMoney, parseDate } from './format.ts'

describe('formatMoney', () => {
  it('formats whole dollars with separators', () => {
    expect(formatMoney(2_000_000)).toBe('$2,000,000')
  })

  it('drops stray cents', () => {
    expect(formatMoney(17_333.4)).toBe('$17,333')
  })
})

describe('formatPercent', () => {
  it('shows one decimal', () => {
    expect(formatPercent(19.4)).toBe('19.4%')
    expect(formatPercent(18)).toBe('18.0%')
  })

  it('uses a true minus sign for losses', () => {
    expect(formatPercent(-3.1)).toBe('−3.1%')
  })

  it('does not show "−0.0%" for tiny losses that round to zero', () => {
    expect(formatPercent(-0.04)).toBe('0.0%')
  })
})

describe('dates', () => {
  it('parses YYYY-MM-DD as a local calendar date, not UTC midnight', () => {
    const date = parseDate('2026-01-15')
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 0, 15])
  })

  it('formats as a short date', () => {
    expect(formatDate('2022-09-12')).toBe('Sep 12, 2022')
  })
})

describe('goal formatting', () => {
  it('formats a projected month', () => {
    expect(formatMonthYear(new Date(2028, 9, 1))).toBe('Oct 2028')
  })

  it('leaves the year off dates in the current year', () => {
    const today = new Date(2026, 10, 5)
    expect(formatShortDate('2026-12-01', today)).toBe('Dec 1')
    expect(formatShortDate('2027-01-01', today)).toBe('Jan 1, 2027')
  })

  it('heads each day of activity with its weekday, adding the year only when it differs', () => {
    const today = new Date(2026, 10, 5)
    expect(formatDay('2026-11-01', today)).toBe('Sun, Nov 1')
    expect(formatDay('2025-11-15', today)).toBe('Sat, Nov 15, 2025')
  })

  it('signs amounts with a true minus, showing cents only when there are some', () => {
    expect(formatSignedMoney(250)).toBe('+$250')
    expect(formatSignedMoney(18.4)).toBe('+$18.40')
    expect(formatSignedMoney(-9.6)).toBe('−$9.60')
    expect(formatSignedMoney(0)).toBe('$0')
  })
})
