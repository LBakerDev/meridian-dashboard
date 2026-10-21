import { Alert, Button, Card, SimpleGrid, Skeleton, Text } from '@mantine/core'
import type { ReactNode } from 'react'

import { useSummary } from '../../api/queries.ts'
import { formatMoney, formatMoneyCompact, formatMultiple } from '../../domain/format.ts'
import classes from './SummaryCards.module.css'

/** The four headline numbers from GET /portfolio/summary. */
export function SummaryCards() {
  const { data: summary, isPending, isError, refetch, isRefetching } = useSummary()

  if (isError) {
    return (
      <Alert color="red" variant="light" title="Couldn't load your portfolio summary">
        <Text size="sm" mb="sm">
          Check your connection and try again.
        </Text>
        <Button size="xs" variant="default" onClick={() => refetch()} loading={isRefetching}>
          Try again
        </Button>
      </Alert>
    )
  }

  if (isPending) {
    return (
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm" aria-busy="true" aria-label="Loading portfolio summary">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} padding="md">
            <Skeleton height={10} width="45%" />
            <Skeleton height={22} width="70%" mt={6} />
            <Skeleton height={10} width="60%" mt={6} />
          </Card>
        ))}
      </SimpleGrid>
    )
  }

  const calledPct = summary.totalCommitted > 0 ? (summary.totalCalled / summary.totalCommitted) * 100 : 0

  return (
    <SimpleGrid component="dl" cols={{ base: 1, xs: 2, md: 4 }} spacing="sm" className={classes.list}>
      <Stat label="Net asset value" value={summary.totalNav}>
        <span className={classes.figure} data-tone={summary.netMoic >= 1 ? 'gain' : 'loss'}>
          {formatMultiple(summary.netMoic)}
        </span>{' '}
        net MOIC
      </Stat>

      <Stat label="Committed" value={summary.totalCommitted}>
        {summary.activeCommitments} active commitments
      </Stat>

      <Stat label="Called" value={summary.totalCalled}>
        {Math.round(calledPct)}% of committed · <span className={classes.figure}>{formatMoneyCompact(summary.unfundedCommitment)}</span> unfunded
      </Stat>

      <Stat label="Distributed" value={summary.totalDistributed}>
        <span className={classes.figure}>{formatMultiple(summary.netDpi)}</span> DPI
      </Stat>
    </SimpleGrid>
  )
}

interface StatProps {
  label: string
  value: number
  children: ReactNode
}

/** One card: a term, its compact value (full amount on hover), and context underneath. */
function Stat({ label, value, children }: StatProps) {
  return (
    <Card padding="md">
      <Text component="dt" size="xs" c="dimmed">
        {label}
      </Text>
      <dd className={classes.detail}>
        <span className={classes.value} title={formatMoney(value)}>
          {formatMoneyCompact(value)}
        </span>
        <Text component="span" size="xs" c="dimmed" className={classes.context}>
          {children}
        </Text>
      </dd>
    </Card>
  )
}
