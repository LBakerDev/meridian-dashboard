import { Text } from '@mantine/core'

import { useAllCommitments, useFunds } from '../../api/queries.ts'
import { currencyOf, indexFunds } from '../../domain/funds.ts'

/**
 * The summary endpoint reports totals in USD but adds non-USD commitments in
 * without converting them. Say so, rather than presenting the totals as exact.
 * Renders nothing until both lists have loaded, or when everything is in USD.
 */
export function CurrencyNote() {
  const commitments = useAllCommitments()
  const funds = useFunds()

  if (!commitments.data || !funds.data) return null

  const fundsById = indexFunds(funds.data.data)
  const countsByCurrency = new Map<string, number>()
  for (const commitment of commitments.data.data) {
    const currency = currencyOf(commitment, fundsById)
    if (currency !== 'USD') countsByCurrency.set(currency, (countsByCurrency.get(currency) ?? 0) + 1)
  }
  if (countsByCurrency.size === 0) return null

  const parts = [...countsByCurrency].map(([currency, count]) => `${count} ${currency} commitment${count === 1 ? '' : 's'}`)

  return (
    <Text size="xs" c="dimmed">
      Totals are reported in USD and include {parts.join(' and ')} added without currency conversion, so treat
      them as approximate.
    </Text>
  )
}
