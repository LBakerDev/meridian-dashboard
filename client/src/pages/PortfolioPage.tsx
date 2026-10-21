import { Button, Group, Stack, Title } from '@mantine/core'
import { useDisclosure, useDocumentTitle } from '@mantine/hooks'

import { CommitDrawer } from '../features/commit/CommitDrawer.tsx'
import { CommitmentsTable } from '../features/portfolio/CommitmentsTable.tsx'
import { CurrencyNote } from '../features/portfolio/CurrencyNote.tsx'
import { SummaryCards } from '../features/portfolio/SummaryCards.tsx'

export function PortfolioPage() {
  useDocumentTitle('Portfolio · Meridian')
  const [committing, commitDrawer] = useDisclosure(false)

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={1} size="h2">
          Portfolio
        </Title>
        {/* The page's one primary action, so it's the one button in the brand color. */}
        <Button color="brand.7" size="md" leftSection={<span aria-hidden="true">+</span>} onClick={commitDrawer.open}>
          Commit capital
        </Button>
      </Group>
      <Stack gap="xs">
        <SummaryCards />
        <CurrencyNote />
      </Stack>
      <CommitmentsTable />
      <CommitDrawer opened={committing} onClose={commitDrawer.close} />
    </Stack>
  )
}
