import { describe, expect, it } from 'vitest'
import {
  currencySymbol,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  formatMultiple,
  formatPercent,
  localizeCurrencyInMessage,
  parseDate,
} from './format.ts'

describe('formatMoney', () => {
  it('formats whole dollars with separators', () => {
    expect(formatMoney(2_000_000)).toBe('$2,000,000')
  })

  it('drops the stray cents in the seed data', () => {
    expect(formatMoney(1_245_678.9)).toBe('$1,245,679')
  })

  it('uses the fund currency', () => {
    expect(formatMoney(250_000, 'EUR')).toBe('€250,000')
  })
})

describe('formatMoneyCompact', () => {
  it.each([
    [5_925_000, '$5.93M'],
    [10_500_000, '$10.5M'],
    [850_000_000, '$850M'],
    [2_100_000_000, '$2.1B'],
    [250_000, '$250K'],
    [0, '$0'],
  ])('formats %d as %s without padded decimals', (amount, expected) => {
    expect(formatMoneyCompact(amount)).toBe(expected)
  })

  it('uses the fund currency', () => {
    expect(formatMoneyCompact(1_180_000, 'EUR')).toBe('€1.18M')
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

describe('formatMultiple', () => {
  it('shows two decimals and a multiplication sign', () => {
    expect(formatMultiple(1.5)).toBe('1.50×')
    expect(formatMultiple(0.96)).toBe('0.96×')
  })
})

describe('currencySymbol', () => {
  it('returns the symbol for a currency code', () => {
    expect(currencySymbol('USD')).toBe('$')
    expect(currencySymbol('EUR')).toBe('€')
  })
})

describe('localizeCurrencyInMessage', () => {
  const serverMessage = 'Minimum commitment for this fund is $250,000.'

  it('swaps the hard-coded "$" for the fund currency', () => {
    expect(localizeCurrencyInMessage(serverMessage, 'EUR')).toBe('Minimum commitment for this fund is €250,000.')
  })

  it('leaves USD messages alone', () => {
    expect(localizeCurrencyInMessage(serverMessage, 'USD')).toBe(serverMessage)
  })

  it('leaves messages without a currency alone', () => {
    expect(localizeCurrencyInMessage('Enter a commitment amount.', 'EUR')).toBe('Enter a commitment amount.')
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
