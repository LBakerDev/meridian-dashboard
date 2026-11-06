import { Stack } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import { useState } from 'react'

import { ActivityTable } from '../features/activity/ActivityTable.tsx'
import { GoalDrawer } from '../features/goals/GoalDrawer.tsx'
import { GoalList } from '../features/goals/GoalList.tsx'
import { NewGoalDrawer } from '../features/goals/NewGoalDrawer.tsx'
import { Headline } from '../features/overview/Headline.tsx'

/** The whole product on one page: what it's worth, your goals, and what happened. */
export function HomePage() {
  useDocumentTitle('Your investments · Meridian')
  const [openGoalId, setOpenGoalId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <Stack gap="lg">
      <Headline />
      <GoalList onOpenGoal={setOpenGoalId} onNewGoal={() => setCreating(true)} />
      <ActivityTable />
      <GoalDrawer goalId={openGoalId} onClose={() => setOpenGoalId(null)} />
      <NewGoalDrawer opened={creating} onClose={() => setCreating(false)} />
    </Stack>
  )
}
