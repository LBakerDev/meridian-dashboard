import { Alert, Button, Card, Group, SegmentedControl, Skeleton, Text, Title } from '@mantine/core'
import { useMemo, useState } from 'react'

import { useHistory, useOverview } from '../../api/queries.ts'
import type { HistoryPoint, Overview } from '../../api/types.ts'
import { formatMoney } from '../../domain/format.ts'
import { useCountUp } from '../../hooks/useCountUp.ts'
import classes from './Headline.module.css'
import { monthLabel, ValueChart } from './ValueChart.tsx'

const RANGES = [
  { label: '6M', value: '6' },
  { label: '1Y', value: '12' },
  { label: 'All', value: 'all' },
]

/** The top card: what everything is worth, how it has grown, and the chart. */
export function Headline() {
  const overview = useOverview()
  const history = useHistory()
  const [range, setRange] = useState('12')
  // The month being scrubbed on the chart, shown in the headline (null: today's totals).
  const [scrubbed, setScrubbed] = useState<HistoryPoint | null>(null)

  // A stable array, so the chart's geometry is reused across headline re-renders.
  const points = useMemo(
    () => (history.data ? (range === 'all' ? history.data : history.data.slice(-Number(range))) : []),
    [history.data, range],
  )

  if (overview.isError) {
    return (
      <Alert color="red" variant="light" title="Couldn't load your investments">
        <Text size="sm" mb="sm">
          Check your connection and try again.
        </Text>
        <Button size="xs" variant="default" onClick={() => overview.refetch()} loading={overview.isRefetching}>
          Try again
        </Button>
      </Alert>
    )
  }

  return (
    <Card component="section" aria-labelledby="investments-heading" className={classes.card}>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <div>
          <Title id="investments-heading" order={1} className={classes.label}>
            Your investments
          </Title>
          {overview.isPending ? <TotalsSkeleton /> : <Totals overview={overview.data} scrubbed={scrubbed} />}
        </div>
        <SegmentedControl
          size="xs"
          aria-label="Chart range"
          data={RANGES}
          value={range}
          onChange={(next) => {
            setRange(next)
            setScrubbed(null)
          }}
        />
      </Group>

      <div className={classes.chartArea}>
        {history.isPending ? (
          <Skeleton height={240} radius="md" aria-label="Loading chart" />
        ) : history.isError ? (
          <Group justify="center" gap="sm" className={classes.chartError}>
            <Text size="sm" c="dimmed">
              Couldn't load the chart.
            </Text>
            <Button size="xs" variant="default" onClick={() => history.refetch()} loading={history.isRefetching}>
              Try again
            </Button>
          </Group>
        ) : (
          <ValueChart points={points} onScrub={setScrubbed} />
        )}
      </div>

      <Group gap="lg" mt="sm" className={classes.legend}>
        <span>
          <span className={classes.swatch} data-line="value" aria-hidden="true" />
          Value
        </span>
        <span>
          <span className={classes.swatch} data-line="growth" aria-hidden="true" />
          Growth
        </span>
        <span>
          <span className={classes.swatch} data-line="contributed" aria-hidden="true" />
          What you put in
          {overview.data && (
            <>
              {' · '}
              <span className={classes.figure}>{formatMoney(overview.data.contributed)}</span>
            </>
          )}
        </span>
      </Group>
    </Card>
  )
}

/**
 * The total and the change. While the chart is being scrubbed they show that
 * month instead ("in Mar 2026"), and snap back to today when it's released.
 */
function Totals({ overview, scrubbed }: { overview: Overview; scrubbed: HistoryPoint | null }) {
  // Counts up on load, and ticks to the new total after a deposit.
  const counted = useCountUp(overview.value)
  const value = scrubbed ? scrubbed.value : counted
  const gain = scrubbed ? scrubbed.value - scrubbed.contributed : overview.gain
  const gainPct = scrubbed ? (scrubbed.contributed ? (gain / scrubbed.contributed) * 100 : 0) : overview.gainPct
  const when = scrubbed ? `in ${monthLabel(scrubbed.month)}` : 'all time'
  const up = gain >= 0
  const amount = formatMoney(Math.abs(gain))
  const percent = `${Math.abs(gainPct).toFixed(1)}%`

  return (
    <>
      <div className={classes.hero} title={formatMoney(scrubbed ? scrubbed.value : overview.value)}>
        {formatMoney(value)}
      </div>
      <Group gap={10} mt={14}>
        <span
          className={classes.change}
          data-tone={up ? 'gain' : 'loss'}
          role="img"
          aria-label={`${up ? 'Up' : 'Down'} ${amount}, ${percent} ${when}`}
        >
          <span aria-hidden="true">{up ? '▲' : '▼'}</span>
          <span className={classes.figure}>
            {amount} · {percent}
          </span>
        </span>
        <Text size="sm" c="dimmed" aria-hidden="true" className={classes.when}>
          {when}
        </Text>
      </Group>
    </>
  )
}

function TotalsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your totals">
      <Skeleton height={44} width={220} mt={10} />
      <Skeleton height={24} width={170} mt={14} radius="xl" />
    </div>
  )
}
