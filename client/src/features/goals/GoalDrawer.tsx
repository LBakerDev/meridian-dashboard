import { Anchor, Drawer, Stack, Text } from '@mantine/core'
import { useState } from 'react'

import { useGoals, usePortfolios } from '../../api/queries.ts'
import { AddMoneyForm } from './AddMoneyForm.tsx'
import { EditGoalForm } from './EditGoalForm.tsx'
import { GoalOverview } from './GoalOverview.tsx'

type View = 'overview' | 'add' | 'edit'

/**
 * One goal: its overview, plus "Add money" and "Edit" inside the same drawer.
 * The goal is read from the goals list, so after a change it shows the
 * refreshed numbers without a separate fetch.
 */
export function GoalDrawer({ goalId, onClose }: { goalId: string | null; onClose: () => void }) {
  const goals = useGoals()
  const portfolios = usePortfolios()
  const [view, setView] = useState<View>('overview')
  // Keep showing the last goal while the drawer slides closed.
  const [shownId, setShownId] = useState<string | null>(goalId)
  if (goalId && goalId !== shownId) {
    setShownId(goalId)
    setView('overview')
  }

  const goal = goals.data?.find((g) => g.id === shownId)
  const portfolio = portfolios.data?.find((p) => p.id === goal?.portfolioId)
  const back = () => setView('overview')

  const title = view === 'add' ? 'Add money' : view === 'edit' ? 'Edit goal' : (goal?.name ?? 'Goal')

  return (
    <Drawer
      opened={goalId !== null}
      onClose={onClose}
      title={title}
      onExitTransitionEnd={() => {
        setShownId(null)
        setView('overview')
      }}
    >
      {!goal ? (
        <Text c="dimmed">{goals.isPending ? 'Loading…' : 'This goal no longer exists.'}</Text>
      ) : view === 'overview' ? (
        <GoalOverview
          goal={goal}
          assumedReturn={portfolio?.assumedReturnPct}
          onAddMoney={() => setView('add')}
          onEdit={() => setView('edit')}
        />
      ) : (
        <Stack gap="md">
          <Anchor component="button" type="button" size="sm" c="dimmed" w="fit-content" onClick={back}>
            ← {goal.name}
          </Anchor>
          {view === 'add' ? (
            <AddMoneyForm goal={goal} assumedReturn={portfolio?.assumedReturnPct} onDone={back} onCancel={back} onGone={onClose} />
          ) : (
            <EditGoalForm
              goal={goal}
              minMonthly={portfolio?.minMonthly ?? 0}
              assumedReturn={portfolio?.assumedReturnPct}
              onDone={back}
              onCancel={back}
              onGone={onClose}
            />
          )}
        </Stack>
      )}
    </Drawer>
  )
}
