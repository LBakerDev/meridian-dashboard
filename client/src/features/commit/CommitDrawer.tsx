import { Drawer, Text } from '@mantine/core'

interface CommitDrawerProps {
  opened: boolean
  onClose: () => void
}

/**
 * Commit capital to an open fund: pick a fund, then enter an amount.
 * Steps 8 and 9 fill this in.
 */
export function CommitDrawer({ opened, onClose }: CommitDrawerProps) {
  return (
    <Drawer opened={opened} onClose={onClose} title="Commit capital">
      <Text size="sm" c="dimmed">
        Capital is called over each fund's investment period, not upfront.
      </Text>
    </Drawer>
  )
}
