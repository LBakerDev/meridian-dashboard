import { AppShell, Container, Group } from '@mantine/core'
import { Link, Outlet } from 'react-router'

import classes from './AppLayout.module.css'
import { AccountMenu } from './AccountMenu.tsx'

// One page, so the header is the brand and the account menu (which holds the
// theme). If sections are added, AppShell makes a header nav or sidebar a small change.
export function AppLayout() {
  return (
    <AppShell header={{ height: 60 }} padding="xl">
      <a href="#main" className={classes.skipLink}>
        Skip to content
      </a>

      <AppShell.Header className={classes.header}>
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Link to="/" className={classes.brand}>
              Meridian
            </Link>
            <AccountMenu />
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main id="main" tabIndex={-1} className={classes.main}>
        <Container size="lg">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
