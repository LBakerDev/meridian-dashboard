import { Stack, Title } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'

import { CurrencyNote } from '../features/portfolio/CurrencyNote.tsx'
import { SummaryCards } from '../features/portfolio/SummaryCards.tsx'

export function PortfolioPage() {
  useDocumentTitle('Portfolio · Meridian')

  return (
    <Stack gap="lg">
      <Title order={1} size="h2">
        Portfolio
      </Title>
      <Stack gap="xs">
        <SummaryCards />
        <CurrencyNote />
      </Stack>
    </Stack>
  )
}
