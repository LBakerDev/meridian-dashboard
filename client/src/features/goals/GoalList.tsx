import { Alert, Badge, Button, Card, Group, Skeleton, Text, Title, UnstyledButton } from '@mantine/core'
import { useMemo } from 'react'

import { useGoals, useOverview, usePortfolios } from '../../api/queries.ts'
import type { Goal } from '../../api/types.ts'
import { formatMoney, formatMonthYear, formatPercent, formatShortDate } from '../../domain/format.ts'
import { goalColor, hasStarted, progress, projectGoal } from '../../domain/goals.ts'
import { RiskDots } from '../shared/RiskDots.tsx'
import classes from './GoalList.module.css'

interface GoalListProps {
  onOpenGoal: (goalId: string) => void
  onNewGoal: () => void
}

export function GoalList({ onOpenGoal, onNewGoal }: GoalListProps) {
  const goals = useGoals()
  const overview = useOverview()
  // Only for "On track for …" (each portfolio's assumed return). Rows work without it.
  const portfolios = usePortfolios()
  const assumedReturn = useMemo(
    () => new Map((portfolios.data ?? []).map((p) => [p.id, p.assumedReturnPct])),
    [portfolios.data],
  )

  return (
    <Card component="section" aria-labelledby="goals-heading" padding={0}>
      <Group justify="space-between" p="md" px="lg" gap="sm">
        <div>
          <Title id="goals-heading" order={2} size="h4">
            Goals
          </Title>
          {overview.data && (
            <Text size="xs" c="dimmed" mt={2}>
              <span className={classes.figure}>{formatMoney(overview.data.monthlyTotal)}</span> a month
              {overview.data.nextDepositDate && ` · next deposit ${formatShortDate(overview.data.nextDepositDate)}`}
            </Text>
          )}
        </div>
        <Button onClick={onNewGoal} leftSection={<span aria-hidden="true">+</span>}>
          New goal
        </Button>
      </Group>

      {goals.isPending ? (
        <div aria-busy="true" aria-label="Loading goals">
          {[0, 1, 2].map((i) => (
            <div key={i} className={classes.skeletonRow}>
              <Skeleton height={14} width="30%" />
              <Skeleton height={8} mt={14} radius="xl" />
            </div>
          ))}
        </div>
      ) : goals.isError ? (
        <Alert color="red" variant="light" title="Couldn't load your goals" m="md" mt={0}>
          <Button size="xs" variant="default" onClick={() => goals.refetch()} loading={goals.isRefetching}>
            Try again
          </Button>
        </Alert>
      ) : goals.data.length === 0 ? (
        <div className={classes.empty}>
          <Text fw={500}>No goals yet</Text>
          <Text size="sm" c="dimmed" mt={4}>
            Name something you're saving for, and Meridian invests toward it every month.
          </Text>
        </div>
      ) : (
        <ul className={classes.list}>
          {goals.data.map((goal) => (
            <li key={goal.id}>
              <GoalRow goal={goal} assumedReturn={assumedReturn.get(goal.portfolioId)} onOpen={() => onOpenGoal(goal.id)} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** "On track for Oct 2028", "Deposits paused", "First deposit Dec 1". */
export function goalStatusText(goal: Goal, assumedReturn: number | undefined): string | null {
  if (goal.status === 'paused') return 'Deposits paused'
  if (!hasStarted(goal)) return goal.nextDepositDate ? `First deposit ${formatShortDate(goal.nextDepositDate)}` : null
  if (goal.value >= goal.target) return 'Target reached'
  if (assumedReturn === undefined) return null
  const { reachedOn } = projectGoal(goal, assumedReturn)
  return reachedOn ? `On track for ${formatMonthYear(reachedOn)}` : null
}

function GoalRow({ goal, assumedReturn, onOpen }: { goal: Goal; assumedReturn: number | undefined; onOpen: () => void }) {
  const share = progress(goal)
  const started = hasStarted(goal)
  const status = goalStatusText(goal, assumedReturn)

  return (
    <UnstyledButton
      className={classes.row}
      style={{ '--goal': goalColor(goal.id) }}
      onClick={onOpen}
      aria-label={`${goal.name}: ${formatMoney(goal.value)}, ${Math.round(share * 100)}% of ${formatMoney(goal.target)}${status ? `. ${status}` : ''}`}
    >
      <div className={classes.main}>
        <Group gap="sm" wrap="nowrap">
          <span className={classes.icon} aria-hidden="true">
            {goal.name.charAt(0).toUpperCase()}
          </span>
          <div className={classes.titles}>
            <Text fw={500} truncate="end">
              {goal.name}
            </Text>
            <Text size="xs" c="dimmed" component="div" className={classes.meta}>
              <span className={classes.portfolio} title={goal.portfolioName}>
                {goal.portfolioName}
              </span>
              <RiskDots risk={goal.risk} />
              <span>
                · <span className={classes.figure}>{formatMoney(goal.monthlyAmount)}</span>/mo
              </span>
            </Text>
          </div>
        </Group>
        <div className={classes.bar} aria-hidden="true">
          <span style={{ width: `${share * 100}%` }} />
        </div>
        <Group justify="space-between" gap="sm" mt={6}>
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
      </div>

      <div className={classes.side}>
        {goal.status === 'paused' && <Badge color="gray" size="sm">Paused</Badge>}
        {started ? (
          <>
            <div className={classes.value}>{formatMoney(goal.value)}</div>
            <div className={classes.figure} data-tone={goal.returnPct < 0 ? 'loss' : 'gain'}>
              {goal.returnPct >= 0 ? '+' : ''}
              {formatPercent(goal.returnPct)}
            </div>
          </>
        ) : (
          goal.status !== 'paused' && (
            <Badge variant="outline" className={classes.pending} size="sm">
              {goal.nextDepositDate ? `Starts ${formatShortDate(goal.nextDepositDate)}` : 'Not started'}
            </Badge>
          )
        )}
      </div>
    </UnstyledButton>
  )
}
