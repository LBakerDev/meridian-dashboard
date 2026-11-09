import { Avatar, Divider, Popover, SegmentedControl, Stack, Text, UnstyledButton, useMantineColorScheme, type MantineColorScheme } from '@mantine/core'

import { ACCOUNT } from '../domain/account.ts'
import classes from './AccountMenu.module.css'
import { track } from '../lib/telemetry.ts'

const SCHEMES: { label: string; value: MantineColorScheme }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'auto' },
]

/**
 * The avatar in the header: who's signed in, the linked bank, and the theme
 * (Light, Dark, or System to follow the device). Mantine remembers the choice.
 *
 * A Popover, not a Menu: this panel holds information and a control, not a list
 * of menu items. A Menu looks for items to focus when it opens; with none, it
 * could close again straight away on touch screens (a flicker).
 */
export function AccountMenu() {
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  return (
    <Popover position="bottom-end" width={260} shadow="md" radius="md" withinPortal trapFocus returnFocus>
      <Popover.Target>
        <UnstyledButton className={classes.trigger} aria-label={`Account menu for ${ACCOUNT.name}`}>
          <Avatar radius="xl" size={34} color="brand" variant="light" className={classes.avatar}>
            {ACCOUNT.initials}
          </Avatar>
        </UnstyledButton>
      </Popover.Target>

      <Popover.Dropdown p={4} aria-label="Account">
        <div className={classes.who}>
          <Text fw={600} size="sm">
            {ACCOUNT.name}
          </Text>
          <Text size="xs" c="dimmed">
            Sample account · demo data
          </Text>
        </div>

        <Divider />
        <Stack gap={2} px="sm" py={6}>
          <Text size="xs" c="dimmed">
            Linked bank
          </Text>
          <Text size="sm">{ACCOUNT.bank}</Text>
        </Stack>

        <Divider />
        <Stack gap={6} px="sm" pt={6} pb="sm">
          <Text size="xs" c="dimmed" id="theme-label">
            Theme
          </Text>
          <SegmentedControl
            size="xs"
            fullWidth
            aria-labelledby="theme-label"
            data={SCHEMES}
            value={colorScheme}
            onChange={(value) => {
              setColorScheme(value as MantineColorScheme)
              track(`theme-${value as MantineColorScheme}`)
            }}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}
