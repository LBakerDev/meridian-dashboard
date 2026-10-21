import { Stack, Title } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'

export function PortfolioPage() {
  useDocumentTitle('Portfolio · Meridian')

  return (
    <Stack gap="lg">
      <Title order={1} size="h2">
        Portfolio
      </Title>
    </Stack>
  )
}
