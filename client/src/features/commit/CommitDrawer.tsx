import { Anchor, Drawer, Stack, Text } from '@mantine/core'
import { useState } from 'react'

import type { Fund } from '../../api/types.ts'
import { CommitForm } from './CommitForm.tsx'
import { FundPicker } from './FundPicker.tsx'

interface CommitDrawerProps {
  opened: boolean
  onClose: () => void
}

/** Commit capital to an open fund, in two steps: pick a fund, then enter an amount. */
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
        <Stack gap="md">
          <Anchor component="button" type="button" size="sm" c="dimmed" onClick={() => setFund(null)} w="fit-content">
            ← Change fund
          </Anchor>
          {/* Keyed by fund so switching funds starts a fresh form. */}
          <CommitForm key={fund.id} fund={fund} onDone={onClose} onChangeFund={() => setFund(null)} onCancel={onClose} />
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
