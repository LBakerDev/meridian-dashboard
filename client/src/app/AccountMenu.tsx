import { Avatar, Menu, SegmentedControl, Stack, Text, UnstyledButton, useMantineColorScheme, type MantineColorScheme } from '@mantine/core'

import classes from './AccountMenu.module.css'

/** The demo's account holder. All data in Meridian is sample data. */
export const ACCOUNT = {
  name: 'London Baker',
  initials: 'LB',
  bank: 'Chase ••4821',
}

const SCHEMES: { label: string; value: MantineColorScheme }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'auto' },
]

/**
 * The avatar in the header: who's signed in, the linked bank, and the theme
 * (Light, Dark, or System to follow the device). Mantine remembers the choice.
 */
export function AccountMenu() {
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  return (
    <Menu position="bottom-end" width={260} shadow="md" radius="md" withinPortal>
      <Menu.Target>
        <UnstyledButton className={classes.trigger} aria-label={`Account menu for ${ACCOUNT.name}`}>
          <Avatar radius="xl" size={34} color="brand" variant="light" className={classes.avatar}>
            {ACCOUNT.initials}
          </Avatar>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <div className={classes.who}>
          <Text fw={600} size="sm">
            {ACCOUNT.name}
          </Text>
          <Text size="xs" c="dimmed">
            Sample account · demo data
          </Text>
        </div>

        <Menu.Divider />
        <Stack gap={2} px="sm" py={6}>
          <Text size="xs" c="dimmed">
            Linked bank
          </Text>
          <Text size="sm">{ACCOUNT.bank}</Text>
        </Stack>

        <Menu.Divider />
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
            onChange={(value) => setColorScheme(value as MantineColorScheme)}
          />
        </Stack>
      </Menu.Dropdown>
    </Menu>
  )
}
