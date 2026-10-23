import { Alert, Box, Button, Card, Group, Progress, SimpleGrid, Skeleton, Text } from '@mantine/core'
import type { ReactNode } from 'react'

import { useSummary } from '../../api/queries.ts'
import type { PortfolioSummary } from '../../api/types.ts'
import { formatMoney, formatMoneyCompact, formatMultiple } from '../../domain/format.ts'
import { useCountUp } from '../../hooks/useCountUp.ts'
import classes from './SummaryCards.module.css'

/**
 * The portfolio's focus area. Leads with total value (NAV + distributions):
 * what the investor's money is worth now, counting cash already returned,
 * which is also what net MOIC is measured against.
 */
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
      <Card padding="xl" aria-busy="true" aria-label="Loading portfolio summary">
        <div className={classes.layout}>
          <div>
            <Skeleton height={12} width={90} />
            <Skeleton height={44} width={220} mt="sm" />
            <Skeleton height={14} width={260} mt="sm" />
          </div>
          <SimpleGrid cols={2} spacing="lg">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton height={10} width="50%" />
                <Skeleton height={20} width="70%" mt={8} />
              </div>
            ))}
          </SimpleGrid>
        </div>
        <Skeleton height={8} mt="xl" />
      </Card>
    )
  }

  return <SummaryPanel summary={summary} />
}

/**
 * The loaded panel. Headline figures count up on first load and tick to their
 * new values when the summary refreshes (after a commit, Committed and Unfunded
 * move by the amount just committed). Exact values (in `title`) are always final.
 */
function SummaryPanel({ summary }: { summary: PortfolioSummary }) {
  const totalValue = summary.totalNav + summary.totalDistributed
  const gain = totalValue - summary.totalCalled
  const calledPct = summary.totalCommitted > 0 ? (summary.totalCalled / summary.totalCommitted) * 100 : 0
  const unfundedPct = 100 - calledPct

  // Only figures on a line of their own count. Numbers inside a sentence (the
  // gain line, the legend) would change width as they count and shove the words
  // after them around, so those show their final value straight away.
  const shownTotal = useCountUp(totalValue)
  const shownCalledPct = useCountUp(calledPct)

  return (
    <Card padding="xl" component="section" aria-label="Portfolio summary">
      <div className={classes.layout}>
        <div>
          <Text size="sm" c="dimmed">
            Total value
          </Text>
          <div className={classes.hero} title={formatMoney(totalValue)}>
            {formatMoneyCompact(shownTotal)}
          </div>
          <Text size="sm" c="dimmed" mt={6}>
            <span className={classes.figure} data-tone={gain >= 0 ? 'gain' : 'loss'}>
              {formatSigned(gain)}
            </span>{' '}
            on <span className={classes.figure}>{formatMoneyCompact(summary.totalCalled)}</span> called ·{' '}
            <span className={classes.figure} data-tone={summary.netMoic >= 1 ? 'gain' : 'loss'}>
              {formatMultiple(summary.netMoic)}
            </span>{' '}
            net MOIC
          </Text>
        </div>

        <SimpleGrid component="dl" cols={2} spacing="lg" verticalSpacing="md" className={classes.stats}>
          <Stat label="Net asset value" value={summary.totalNav}>
            current value of holdings
          </Stat>
          <Stat label="Distributed" value={summary.totalDistributed}>
            <span className={classes.figure}>{formatMultiple(summary.netDpi)}</span> DPI
          </Stat>
          <Stat label="Committed" value={summary.totalCommitted}>
            {summary.activeCommitments} active commitments
          </Stat>
          <Stat label="Unfunded" value={summary.unfundedCommitment}>
            {Math.round(unfundedPct)}% left to be called
          </Stat>
        </SimpleGrid>
      </div>

      <Box mt="xl">
        <Group justify="space-between" mb={8}>
          <Text size="xs" c="dimmed">
            Capital called
          </Text>
          <Text size="xs" c="dimmed">
            <span className={classes.figure}>{Math.round(calledPct)}%</span> of{' '}
            <span className={classes.figure}>{formatMoneyCompact(summary.totalCommitted)}</span> committed
          </Text>
        </Group>
        {/* The count-up drives the width frame by frame, so turn off Progress's own easing. */}
        <Progress.Root size={8} transitionDuration={0}>
          <Progress.Section value={shownCalledPct} color="ink" aria-label="Called" />
          <Progress.Section value={100 - shownCalledPct} color="gray.3" aria-label="Unfunded" />
        </Progress.Root>
        <Group gap="lg" mt={8}>
          <Legend swatch="called" label="Called" value={summary.totalCalled} />
          <Legend swatch="unfunded" label="Unfunded" value={summary.unfundedCommitment} />
        </Group>
      </Box>
    </Card>
  )
}

/** "+$7.7M" / "−$1.2M", with a true minus sign. */
function formatSigned(amount: number): string {
  const formatted = formatMoneyCompact(Math.abs(amount))
  return amount < 0 ? `−${formatted}` : `+${formatted}`
}

function Stat({ label, value, children }: { label: string; value: number; children: ReactNode }) {
  const shown = useCountUp(value)
  return (
    <div>
      <Text component="dt" size="xs" c="dimmed">
        {label}
      </Text>
      <dd className={classes.detail}>
        <span className={classes.value} title={formatMoney(value)}>
          {formatMoneyCompact(shown)}
        </span>
        <Text component="span" size="xs" c="dimmed" className={classes.context}>
          {children}
        </Text>
      </dd>
    </div>
  )
}

function Legend({ swatch, label, value }: { swatch: 'called' | 'unfunded'; label: string; value: number }) {
  return (
    <Group gap={6}>
      <span className={classes.swatch} data-swatch={swatch} aria-hidden="true" />
      <Text size="xs" c="dimmed">
        {label} <span className={classes.figure}>{formatMoneyCompact(value)}</span>
      </Text>
    </Group>
  )
}
