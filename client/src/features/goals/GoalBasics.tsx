import { Button, Group, NumberInput, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'

import { MAX_NAME_LENGTH } from './NewGoalForm.tsx'

export interface Basics {
  name: string
  target: number
}

const SUGGESTIONS = ['House deposit', 'Emergency fund', 'Travel', 'Wedding', 'New car']

interface GoalBasicsProps {
  initial: Basics | null
  onNext: (basics: Basics) => void
  onCancel: () => void
}

/** Step one of a new goal: what it's for, and how much. */
export function GoalBasics({ initial, onNext, onCancel }: GoalBasicsProps) {
  const form = useForm<{ name: string; target: number | string }>({
    initialValues: { name: initial?.name ?? '', target: initial?.target ?? '' },
    validate: {
      name: (value) =>
        !value.trim() ? 'Give your goal a name.' : value.trim().length > MAX_NAME_LENGTH ? `Keep the name under ${MAX_NAME_LENGTH} characters.` : null,
      target: (value) => (typeof value !== 'number' || value < 100 ? 'Set a target of at least $100.' : null),
    },
  })

  return (
    <form noValidate onSubmit={form.onSubmit((values) => onNext({ name: values.name.trim(), target: values.target as number }))}>
      <Stack gap="md">
        <div>
          <TextInput data-autofocus label="Goal" placeholder="e.g. Wedding" maxLength={60} {...form.getInputProps('name')} />
          <Group gap="xs" mt="xs" role="group" aria-label="Suggestions">
            {SUGGESTIONS.map((suggestion) => (
              <Button key={suggestion} size="compact-xs" variant="default" fw={400} onClick={() => form.setFieldValue('name', suggestion)}>
                {suggestion}
              </Button>
            ))}
          </Group>
        </div>

        <NumberInput label="Target" prefix="$" placeholder="$15,000" min={0} {...form.getInputProps('target')} />

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Next: how to invest it</Button>
        </Group>
      </Stack>
    </form>
  )
}
