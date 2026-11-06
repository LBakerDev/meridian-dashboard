import { Alert, Button, Text } from '@mantine/core'

import { isApiError } from '../../api/client.ts'

/** A problem that isn't about one field. Shown above the buttons; what was typed stays. */
export interface FormProblem {
  title: string
  message: string
  /** The thing being acted on is gone or closed, so offer a way back. */
  recover?: { label: string; onClick: () => void }
}

/**
 * Routes a failed request to the right place:
 * - 400 with fields we show: messages go under those fields, via `setFieldErrors`.
 * - 404 / 409: a problem with a way back (`onGone`), e.g. "Choose another portfolio".
 * - No network: nothing was sent, try again.
 * - Anything else: a generic problem.
 * Returns the problem to show, or null when the fields carry the errors.
 */
export function toFormProblem(
  error: unknown,
  {
    fields,
    setFieldErrors,
    gone,
  }: {
    fields: readonly string[]
    setFieldErrors: (errors: Record<string, string>) => void
    gone?: { title: string; recover: FormProblem['recover'] }
  },
): FormProblem | null {
  if (!isApiError(error)) return { title: 'Something went wrong', message: 'Please try again.' }

  const known = Object.entries(error.fields).filter(([field]) => fields.includes(field))
  if (error.status === 400 && known.length > 0) {
    setFieldErrors(Object.fromEntries(known))
    return null
  }
  if ((error.status === 404 || error.status === 409) && gone) {
    return { title: gone.title, message: error.message, recover: gone.recover }
  }
  if (error.isNetworkError) {
    return { title: "Couldn't reach the server", message: 'Nothing was sent. Check your connection and try again.' }
  }
  return { title: 'Something went wrong', message: `${error.message} Please try again.` }
}

export function ProblemAlert({ problem }: { problem: FormProblem }) {
  return (
    <Alert color="red" variant="light" title={problem.title}>
      <Text size="sm">{problem.message}</Text>
      {problem.recover && (
        <Button size="xs" variant="default" mt="sm" onClick={problem.recover.onClick}>
          {problem.recover.label}
        </Button>
      )}
    </Alert>
  )
}
