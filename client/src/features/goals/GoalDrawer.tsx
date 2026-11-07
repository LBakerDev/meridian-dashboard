import { Anchor, Drawer, Stack, Text } from '@mantine/core'
import { useState } from 'react'

import { useGoals, usePortfolios } from '../../api/queries.ts'
import { hasStarted } from '../../domain/goals.ts'
import { AddMoneyForm } from './AddMoneyForm.tsx'
import { EditGoalForm } from './EditGoalForm.tsx'
import { GoalOverview, type Arrival } from './GoalOverview.tsx'
import { RemoveGoal } from './RemoveGoal.tsx'

type View = 'overview' | 'add' | 'edit' | 'remove'

/**
 * One goal: its overview, plus Add money, Edit, and Delete / Close inside the
 * same drawer. The goal is read from the goals list, so after a change it shows
 * the refreshed numbers without a separate fetch.
 */
export function GoalDrawer({ goalId, onClose }: { goalId: string | null; onClose: () => void }) {
  const goals = useGoals()
  const portfolios = usePortfolios()
  const [view, setView] = useState<View>('overview')
  // After a deposit: where the bar grows from, and any milestone it crossed.
  const [arrival, setArrival] = useState<Arrival | null>(null)
  // Keep showing the last goal while the drawer slides closed.
  const [shownId, setShownId] = useState<string | null>(goalId)
  if (goalId && goalId !== shownId) {
    setShownId(goalId)
    setView('overview')
    setArrival(null)
  }

  const goal = goals.data?.find((g) => g.id === shownId)
  const portfolio = portfolios.data?.find((p) => p.id === goal?.portfolioId)
  const go = (next: View) => {
    setArrival(null)
    setView(next)
  }

  const title =
    view === 'add' ? 'Add money'
    : view === 'edit' ? 'Edit goal'
    : view === 'remove' ? (goal && hasStarted(goal) ? 'Close goal' : 'Delete goal')
    : (goal?.name ?? 'Goal')

  return (
    <Drawer
      opened={goalId !== null}
      onClose={onClose}
      title={title}
      onExitTransitionEnd={() => {
        setShownId(null)
        setView('overview')
        setArrival(null)
      }}
    >
      {!goal ? (
        <Text c="dimmed">{goals.isPending ? 'Loading…' : 'This goal no longer exists.'}</Text>
      ) : view === 'overview' ? (
        <GoalOverview
          goal={goal}
          assumedReturn={portfolio?.assumedReturnPct}
          arrival={arrival}
          onAddMoney={() => go('add')}
          onEdit={() => go('edit')}
        />
      ) : (
        <Stack gap="md">
          <Anchor
            component="button"
            type="button"
            size="sm"
            c="dimmed"
            w="fit-content"
            onClick={() => go(view === 'remove' ? 'edit' : 'overview')}
          >
            ← {view === 'remove' ? 'Edit goal' : goal.name}
          </Anchor>
          {view === 'add' ? (
            <AddMoneyForm
              goal={goal}
              assumedReturn={portfolio?.assumedReturnPct}
              onDone={(next) => {
                setArrival(next)
                setView('overview')
              }}
              onCancel={() => go('overview')}
              onGone={onClose}
            />
          ) : view === 'edit' ? (
            <EditGoalForm
              goal={goal}
              minMonthly={portfolio?.minMonthly ?? 0}
              assumedReturn={portfolio?.assumedReturnPct}
              onDone={() => go('overview')}
              onCancel={() => go('overview')}
              onGone={onClose}
              onRemove={() => go('remove')}
            />
          ) : (
            <RemoveGoal goal={goal} onDone={onClose} onKeep={() => go('overview')} />
          )}
        </Stack>
      )}
    </Drawer>
  )
}
