import { Button, Group, NumberInput, Stack, Switch, Text, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useUpdateGoal } from '../../api/queries.ts'
import type { Goal } from '../../api/types.ts'
import { formatMoney, formatMonthYear } from '../../domain/format.ts'
import { hasStarted, project } from '../../domain/goals.ts'
import { ProblemAlert, toFormProblem, type FormProblem } from '../shared/formErrors.tsx'
import { ACCOUNT } from '../../domain/account.ts'
import classes from './drawers.module.css'
import { MAX_NAME_LENGTH } from './NewGoalForm.tsx'

interface FormValues {
  name: string
  target: number | string
  monthlyAmount: number | string
  paused: boolean
}

interface EditGoalFormProps {
  goal: Goal
  minMonthly: number
  assumedReturn: number | undefined
  onDone: () => void
  onCancel: () => void
  onGone: () => void
  /** Delete (nothing in it yet) or close and withdraw (funded). */
  onRemove: () => void
}

/** Rename, change the target or monthly amount, or pause deposits, seeing the effect before saving. */
export function EditGoalForm({ goal, minMonthly, assumedReturn, onDone, onCancel, onGone, onRemove }: EditGoalFormProps) {
  const updateGoal = useUpdateGoal()
  const [problem, setProblem] = useState<FormProblem | null>(null)

  const form = useForm<FormValues>({
    initialValues: { name: goal.name, target: goal.target, monthlyAmount: goal.monthlyAmount, paused: goal.status === 'paused' },
    validate: {
      name: (value) =>
        !value.trim() ? 'Give your goal a name.' : value.trim().length > MAX_NAME_LENGTH ? `Keep the name under ${MAX_NAME_LENGTH} characters.` : null,
      target: (value) =>
        typeof value !== 'number' || value <= goal.value
          ? `Set a target above what's already saved (${formatMoney(goal.value)}).`
          : null,
      monthlyAmount: (value, values) => {
        if (values.paused) return null
        if (typeof value !== 'number') return 'Enter a monthly amount.'
        return value < minMonthly ? `${goal.portfolioName} needs at least ${formatMoney(minMonthly)} a month.` : null
      },
    },
  })

  const { paused } = form.values
  const target = typeof form.values.target === 'number' ? form.values.target : null
  const monthly = typeof form.values.monthlyAmount === 'number' ? form.values.monthlyAmount : null
  const projectFor = (m: number, t: number) =>
    assumedReturn === undefined ? null : project({ value: goal.value, monthly: m, target: t, annualReturnPct: assumedReturn }).reachedOn
  const was = projectFor(goal.status === 'paused' ? 0 : goal.monthlyAmount, goal.target)
  const willBe = target && monthly !== null ? projectFor(paused ? 0 : monthly, target) : null

  const submit = form.onSubmit(async (values) => {
    if (updateGoal.isPending) return
    setProblem(null)
    try {
      await updateGoal.mutateAsync({
        id: goal.id,
        name: values.name.trim(),
        target: typeof values.target === 'number' ? values.target : null,
        monthlyAmount: typeof values.monthlyAmount === 'number' ? values.monthlyAmount : null,
        paused: values.paused,
      })
      notifications.show({ title: 'Goal updated', message: values.name.trim() })
      onDone()
    } catch (error) {
      setProblem(
        toFormProblem(error, {
          fields: ['name', 'target', 'monthlyAmount'],
          setFieldErrors: form.setErrors,
          gone: { title: 'This goal no longer exists', recover: { label: 'Close', onClick: onGone } },
        }),
      )
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <TextInput data-autofocus label="Name" maxLength={60} {...form.getInputProps('name')} />
        <Group grow align="flex-start">
          <NumberInput label="Target" prefix="$" min={0} {...form.getInputProps('target')} />
          <NumberInput label="Each month" prefix="$" min={0} disabled={paused} {...form.getInputProps('monthlyAmount')} />
        </Group>
        <Switch
          label="Pause monthly deposits"
          description="The goal stays invested. Resume any time."
          {...form.getInputProps('paused', { type: 'checkbox' })}
        />

        <div className={classes.projection} aria-live="polite">
          {paused ? (
            <Text size="sm">Deposits stop until you resume. {goal.name} stays invested.</Text>
          ) : willBe && monthly ? (
            <Text size="sm">
              At <span className={classes.figure}>{formatMoney(monthly)}</span> a month: <b>{formatMonthYear(willBe)}</b>
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              Enter a target and a monthly amount to see your new date.
            </Text>
          )}
          {/* Only worth saying when the date has moved. */}
          {was && (paused || !willBe || formatMonthYear(was) !== formatMonthYear(willBe)) && (
            <Text size="xs" c="dimmed" mt={4}>
              Was: {formatMonthYear(was)}
            </Text>
          )}
        </div>

        {problem && <ProblemAlert problem={problem} />}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={updateGoal.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={updateGoal.isPending}>
            Save changes
          </Button>
        </Group>

        {/* Kept apart from everyday actions, below a divider. */}
        <div className={classes.danger}>
          <Button variant="transparent" color="red" px={0} className={classes.dangerButton} onClick={onRemove} disabled={updateGoal.isPending}>
            {hasStarted(goal) ? 'Close goal and withdraw' : 'Delete goal'}
          </Button>
          <Text size="xs" c="dimmed">
            {hasStarted(goal)
              ? `Sells its investments and sends the money to ${ACCOUNT.bank}.`
              : 'Nothing has been deposited yet.'}
          </Text>
        </div>
      </Stack>
    </form>
  )
}
