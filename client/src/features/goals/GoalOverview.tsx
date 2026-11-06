import { Button, Group, Skeleton, Stack, Text, Title } from '@mantine/core'

import { useActivity } from '../../api/queries.ts'
import type { Goal } from '../../api/types.ts'
import { formatMoney, formatPercent, formatShortDate, formatSignedMoney } from '../../domain/format.ts'
import { goalColor, hasStarted, progress } from '../../domain/goals.ts'
import { useCountUp } from '../../hooks/useCountUp.ts'
import { RiskDots } from '../shared/RiskDots.tsx'
import classes from './drawers.module.css'
import { goalStatusText } from './GoalList.tsx'

interface GoalOverviewProps {
  goal: Goal
  assumedReturn: number | undefined
  onAddMoney: () => void
  onEdit: () => void
}

/** A goal at a glance, its two actions, and its latest activity. */
export function GoalOverview({ goal, assumedReturn, onAddMoney, onEdit }: GoalOverviewProps) {
  const recent = useActivity({ goalId: goal.id, pageSize: 5 })
  // Ticks up to the new value after "Add money".
  const shownValue = useCountUp(goal.value)
  const share = progress(goal)
  const status = goalStatusText(goal, assumedReturn)

  return (
    <Stack gap="lg" style={{ '--goal': goalColor(goal.id) }}>
      <div>
        <Group gap="sm" wrap="nowrap">
          <span className={classes.icon} aria-hidden="true">
            {goal.name.charAt(0).toUpperCase()}
          </span>
          <Text size="sm" c="dimmed" component="div">
            <Group gap={6} wrap="nowrap">
              <span>{goal.portfolioName}</span>
              <RiskDots risk={goal.risk} />
            </Group>
          </Text>
        </Group>

        <div className={classes.hero} style={{ marginTop: 16 }} title={formatMoney(goal.value)}>
          {formatMoney(shownValue)}
        </div>
        {hasStarted(goal) && (
          <Text size="sm" mt={6}>
            <span className={`${classes.figure} ${goal.returnPct < 0 ? classes.loss : classes.gain}`}>
              {goal.returnPct >= 0 ? '+' : ''}
              {formatPercent(goal.returnPct)}
            </span>{' '}
            <Text span c="dimmed" size="sm">
              on <span className={classes.figure}>{formatMoney(goal.contributed)}</span> put in
            </Text>
          </Text>
        )}

        <div
          className={classes.bar}
          style={{ marginTop: 16 }}
          role="progressbar"
          aria-label="Progress to target"
          aria-valuenow={Math.round(share * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${share * 100}%` }} />
        </div>
        <Group justify="space-between" mt={6} gap="sm">
          <Text size="xs" c="dimmed">
            <span className={classes.figure}>{Math.round(share * 100)}%</span> of{' '}
            <span className={classes.figure}>{formatMoney(goal.target)}</span>
          </Text>
          {status && (
            <Text size="xs" c="dimmed">
              {status}
            </Text>
          )}
        </Group>
        <Text size="xs" c="dimmed" mt={4}>
          <span className={classes.figure}>{formatMoney(goal.monthlyAmount)}</span> a month
          {goal.status === 'paused' ? ' · paused' : goal.nextDepositDate ? ` · next on ${formatShortDate(goal.nextDepositDate)}` : ''}
        </Text>
      </div>

      <Group grow gap="sm">
        <Button onClick={onAddMoney}>Add money</Button>
        <Button variant="default" onClick={onEdit}>
          Edit
        </Button>
      </Group>

      <div>
        <Title order={3} size="h6" mb={4}>
          Recent activity
        </Title>
        {recent.isPending ? (
          <Skeleton height={60} aria-label="Loading recent activity" />
        ) : recent.isError ? (
          <Text size="sm" c="dimmed">
            Couldn't load recent activity.
          </Text>
        ) : recent.data.data.length === 0 ? (
          <Text size="sm" c="dimmed">
            Nothing yet.{goal.nextDepositDate ? ` Your first deposit is on ${formatShortDate(goal.nextDepositDate)}.` : ''}
          </Text>
        ) : (
          <ul className={classes.recent}>
            {recent.data.data.map((entry) => (
              <li key={entry.id}>
                <div>
                  <Text size="sm">{entry.description}</Text>
                  <Text size="xs" c="dimmed">
                    {formatShortDate(entry.date)}
                  </Text>
                </div>
                <Text size="sm" className={classes.figure}>
                  {formatSignedMoney(entry.amount)}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Stack>
  )
}
