import { AppShell, Container, Group } from '@mantine/core'
import { Link, NavLink, Outlet } from 'react-router'

import classes from './AppLayout.module.css'

// Two sections, so the nav lives in the header. AppShell makes moving it to a
// sidebar a small change if the product grows past four or five sections.
const NAV_ITEMS = [
  { to: '/', label: 'Portfolio', end: true },
  { to: '/funds', label: 'Open funds', end: false },
]

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
            <nav aria-label="Main">
              <Group gap={4} wrap="nowrap">
                {NAV_ITEMS.map((item) => (
                  // NavLink sets aria-current="page" on the active link; the CSS styles that.
                  <NavLink key={item.to} to={item.to} end={item.end} className={classes.navLink}>
                    {item.label}
                  </NavLink>
                ))}
              </Group>
            </nav>
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
