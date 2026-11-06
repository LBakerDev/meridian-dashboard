import { Anchor, Drawer, Stack, Text } from '@mantine/core'
import { useState } from 'react'

import type { Portfolio } from '../../api/types.ts'
import { NewGoalForm } from './NewGoalForm.tsx'
import { PortfolioPicker } from './PortfolioPicker.tsx'

/** New goal, in two steps: pick a portfolio, then set the goal up. */
export function NewGoalDrawer({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  // Remembered so "Change portfolio" highlights where you were.
  const [lastId, setLastId] = useState<string | null>(null)

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="New goal"
      // Reset once the close animation finishes, so the content doesn't jump while sliding out.
      onExitTransitionEnd={() => {
        setPortfolio(null)
        setLastId(null)
      }}
    >
      {portfolio ? (
        <Stack gap="md">
          <Anchor component="button" type="button" size="sm" c="dimmed" w="fit-content" onClick={() => setPortfolio(null)}>
            ← Change portfolio
          </Anchor>
          {/* Keyed by portfolio, so switching starts a fresh form. */}
          <NewGoalForm
            key={portfolio.id}
            portfolio={portfolio}
            onCreated={onClose}
            onChangePortfolio={() => setPortfolio(null)}
            onCancel={onClose}
          />
        </Stack>
      ) : (
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Pick where the money goes. You can change the amounts later.
          </Text>
          <PortfolioPicker
            selectedId={lastId}
            onSelect={(next) => {
              setPortfolio(next)
              setLastId(next.id)
            }}
          />
        </Stack>
      )}
    </Drawer>
  )
}
