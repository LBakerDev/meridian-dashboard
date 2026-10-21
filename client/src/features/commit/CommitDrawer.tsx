import { Anchor, Drawer, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'

import type { Fund } from '../../api/types.ts'
import { FundPicker } from './FundPicker.tsx'

interface CommitDrawerProps {
  opened: boolean
  onClose: () => void
}

/**
 * Commit capital to an open fund, in two steps: pick a fund, then enter an
 * amount. The amount form arrives in step 9.
 */
export function CommitDrawer({ opened, onClose }: CommitDrawerProps) {
  const [fund, setFund] = useState<Fund | null>(null)
  // Remembered so "Change fund" highlights where you were.
  const [lastFundId, setLastFundId] = useState<string | null>(null)

  const choose = (next: Fund) => {
    setFund(next)
    setLastFundId(next.id)
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Commit capital"
      // Reset once the close animation finishes, so the content doesn't jump while sliding out.
      onExitTransitionEnd={() => {
        setFund(null)
        setLastFundId(null)
      }}
    >
      {fund ? (
        <Stack gap="xs">
          <Anchor component="button" type="button" size="sm" c="dimmed" onClick={() => setFund(null)} w="fit-content">
            ← Change fund
          </Anchor>
          <Title order={3} size="h4">
            {fund.name}
          </Title>
          <Text size="sm" c="dimmed">
            {fund.strategy} · {fund.manager}
          </Text>
        </Stack>
      ) : (
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Choose a fund. Capital is called over each fund's investment period, not upfront.
          </Text>
          <FundPicker onSelect={choose} selectedId={lastFundId} />
        </Stack>
      )}
    </Drawer>
  )
}
