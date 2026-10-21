import { Stack, Text, Title } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'

export function FundsPage() {
  useDocumentTitle('Open funds · Meridian')

  return (
    <Stack gap="lg">
      <div>
        <Title order={1} size="h2">
          Open funds
        </Title>
        <Text c="dimmed" mt={4}>
          Capital is called over each fund's investment period, not upfront.
        </Text>
      </div>
    </Stack>
  )
}
