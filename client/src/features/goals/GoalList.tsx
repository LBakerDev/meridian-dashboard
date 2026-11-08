import { Alert, Badge, Button, Card, Group, Skeleton, Text, Title, UnstyledButton, VisuallyHidden } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { memo, useMemo } from 'react'

import { useGoals, useOverview, usePortfolios, useReorderGoals } from '../../api/queries.ts'
import type { Goal } from '../../api/types.ts'
import { formatMoney, formatMonthYear, formatPercent, formatShortDate } from '../../domain/format.ts'
import { goalColor, hasStarted, progress, projectGoal } from '../../domain/goals.ts'
import { RiskDots } from '../shared/RiskDots.tsx'
import classes from './GoalList.module.css'
import { GoalProgress } from './GoalProgress.tsx'
import { MoveMenu } from './MoveMenu.tsx'
import { useGoalReorder } from './useGoalReorder.ts'

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

  // The person's own order: drag, keyboard or the Move menu. Saved optimistically.
  const byId = useMemo(() => new Map((goals.data ?? []).map((g) => [g.id, g])), [goals.data])
  const ids = useMemo(() => (goals.data ?? []).map((g) => g.id), [goals.data])
  const reorderGoals = useReorderGoals()
  const reorder = useGoalReorder({
    ids,
    nameOf: (id) => byId.get(id)?.name ?? 'Goal',
    onReorder: (next) =>
      reorderGoals.mutateAsync(next).catch(() =>
        notifications.show({ color: 'red', title: "Couldn't save the new order", message: 'Your goals are back in their previous order.' }),
      ),
  })

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
        <>
          <ul className={classes.list} ref={reorder.listRef}>
            {reorder.order.map((id, index) => {
              const goal = byId.get(id)
              if (!goal) return null
              return (
                <li
                  key={id}
                  className={classes.item}
                  data-lifted={reorder.liftedId === id || undefined}
                  onPointerDown={reorder.rowPointerDown(index)}
                >
                  <button type="button" className={classes.grip} {...reorder.gripProps(id, index)}>
                    <GripIcon />
                  </button>
                  <GoalRow goal={goal} assumedReturn={assumedReturn.get(goal.portfolioId)} onOpenGoal={onOpenGoal} />
                  {reorder.menuFor === id && (
                    <MoveMenu
                      name={goal.name}
                      index={index}
                      count={reorder.order.length}
                      onMove={(to) => reorder.moveTo(id, to)}
                      onClose={() => reorder.closeMenu(id)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
          <VisuallyHidden id={reorder.helpId}>
            To reorder, press Space to pick up, the arrow keys to move, and Space to drop. Escape cancels. Or click for a Move menu.
          </VisuallyHidden>
          <VisuallyHidden role="status" aria-live="assertive">
            {reorder.announcement}
          </VisuallyHidden>
        </>
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

const GripIcon = () => (
  <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
    <circle cx="2" cy="2" r="1.5" />
    <circle cx="8" cy="2" r="1.5" />
    <circle cx="2" cy="8" r="1.5" />
    <circle cx="8" cy="8" r="1.5" />
    <circle cx="2" cy="14" r="1.5" />
    <circle cx="8" cy="14" r="1.5" />
  </svg>
)

interface GoalRowProps {
  goal: Goal
  assumedReturn: number | undefined
  onOpenGoal: (goalId: string) => void
}

/** Memoized: picking up or moving one goal doesn't re-render the others' contents. */
const GoalRow = memo(function GoalRow({ goal, assumedReturn, onOpenGoal }: GoalRowProps) {
  const share = progress(goal)
  const started = hasStarted(goal)
  // A goal that hasn't started already shows its start date on the right
  // ("Starts Dec 1"), so the line under its bar says something else.
  const status = !started && goal.status !== 'paused' ? 'Not started yet' : goalStatusText(goal, assumedReturn)

  return (
    <UnstyledButton
      className={classes.row}
      style={{ '--goal': goalColor(goal.id) }}
      onClick={() => onOpenGoal(goal.id)}
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
        <div className={classes.progress}>
          <GoalProgress share={share} size="sm" />
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
})
