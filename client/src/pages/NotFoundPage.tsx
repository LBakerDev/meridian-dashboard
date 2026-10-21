import { Button, Stack, Text, Title } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import { Link } from 'react-router'

export function NotFoundPage() {
  useDocumentTitle('Page not found · Meridian')

  return (
    <Stack gap="md" align="flex-start">
      <Title order={1} size="h2">
        Page not found
      </Title>
      <Text c="dimmed">That address doesn't match anything in Meridian.</Text>
      <Button component={Link} to="/" variant="default">
        Back to portfolio
      </Button>
    </Stack>
  )
}
