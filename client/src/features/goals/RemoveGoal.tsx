import { Button, Group, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useCloseGoal, useDeleteGoal, useRestoreGoal } from '../../api/queries.ts'
import type { Goal } from '../../api/types.ts'
import { ACCOUNT } from '../../domain/account.ts'
import { formatMoney, formatShortDate } from '../../domain/format.ts'
import { hasStarted } from '../../domain/goals.ts'
import { ProblemAlert, toFormProblem, type FormProblem } from '../shared/formErrors.tsx'
import classes from './drawers.module.css'

interface RemoveGoalProps {
  goal: Goal
  /** After removing: close the drawer. */
  onDone: () => void
  onKeep: () => void
}

/**
 * Removing a goal means different things depending on whether money has gone in:
 * - Nothing yet: delete it. Simple, with Undo in the toast.
 * - Funded: close it, which sells its investments and withdraws the value, so the
 *   confirmation says exactly what will happen.
 */
export function RemoveGoal({ goal, onDone, onKeep }: RemoveGoalProps) {
  const deleteGoal = useDeleteGoal()
  const restoreGoal = useRestoreGoal()
  const closeGoal = useCloseGoal()
  const [problem, setProblem] = useState<FormProblem | null>(null)
  const funded = hasStarted(goal)
  const pending = deleteGoal.isPending || closeGoal.isPending

  const fail = (error: unknown) =>
    setProblem(
      toFormProblem(error, {
        fields: [],
        setFieldErrors: () => {},
        gone: { title: 'This goal has changed', recover: { label: 'Back to the goal', onClick: onKeep } },
      }),
    )

  const remove = async () => {
    setProblem(null)
    try {
      if (funded) {
        const { amount } = await closeGoal.mutateAsync(goal.id)
        notifications.show({ title: `${goal.name} closed`, message: `${formatMoney(amount)} is on its way to ${ACCOUNT.bank}` })
      } else {
        await deleteGoal.mutateAsync(goal.id)
        const id = notifications.show({
          title: `${goal.name} deleted`,
          autoClose: 6000,
          message: (
            <Button
              size="compact-xs"
              variant="subtle"
              px={0}
              onClick={async () => {
                notifications.hide(id)
                await restoreGoal.mutateAsync(goal.id)
                notifications.show({ title: `${goal.name} restored`, message: 'Its deposits continue as before.' })
              }}
            >
              Undo
            </Button>
          ),
        })
      }
      onDone()
    } catch (error) {
      fail(error)
    }
  }

  return (
    <Stack gap="md">
      <Title order={3} size="h4">
        {funded ? `Close ${goal.name}?` : `Delete ${goal.name}?`}
      </Title>

      {funded ? (
        <>
          <Text size="sm" c="dimmed">
            We'll sell its investments and send about{' '}
            <Text span fw={600} c="var(--mantine-color-text)" className={classes.figure}>
              {formatMoney(goal.value)}
            </Text>{' '}
            to {ACCOUNT.bank}. It usually arrives in 3–5 business days.
          </Text>
          <Text size="sm" c="dimmed">
            Selling can have tax consequences. Your other goals aren't affected.
          </Text>
        </>
      ) : (
        <Text size="sm" c="dimmed">
          {goal.nextDepositDate ? `The ${formatShortDate(goal.nextDepositDate)} deposit is cancelled. ` : ''}
          There's no money in it, so nothing else changes.
        </Text>
      )}

      {problem && <ProblemAlert problem={problem} />}

      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onKeep} disabled={pending}>
          Keep goal
        </Button>
        <Button color="red" onClick={remove} loading={pending}>
          {funded ? `Close and withdraw ${formatMoney(goal.value)}` : 'Delete goal'}
        </Button>
      </Group>
    </Stack>
  )
}
