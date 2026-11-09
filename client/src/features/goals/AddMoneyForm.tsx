import { Button, Chip, Group, NumberInput, Stack, Text } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useAddMoney } from '../../api/queries.ts'
import type { Goal } from '../../api/types.ts'
import { formatMoney, formatMonthYear } from '../../domain/format.ts'
import { crossedMilestone, milestoneMessage, progress, project } from '../../domain/goals.ts'
import { ProblemAlert, toFormProblem, type FormProblem } from '../shared/formErrors.tsx'
import classes from './drawers.module.css'
import type { Arrival } from './GoalOverview.tsx'
import { track } from '../../lib/telemetry.ts'

export const MIN_DEPOSIT = 10
export const MAX_DEPOSIT = 10_000
const QUICK_AMOUNTS = [50, 100, 250, 500]

interface AddMoneyFormProps {
  goal: Goal
  assumedReturn: number | undefined
  /** Called with where the bar should grow from, and any milestone the deposit crossed. */
  onDone: (arrival: Arrival) => void
  onCancel: () => void
  onGone: () => void
}

/** A one-off deposit, with what it does for the goal's date. */
export function AddMoneyForm({ goal, assumedReturn, onDone, onCancel, onGone }: AddMoneyFormProps) {
  const addMoney = useAddMoney()
  const [problem, setProblem] = useState<FormProblem | null>(null)

  const form = useForm<{ amount: number | string }>({
    initialValues: { amount: '' },
    validate: {
      amount: (value) => {
        if (typeof value !== 'number') return 'Enter an amount.'
        if (value < MIN_DEPOSIT) return `The minimum one-off deposit is ${formatMoney(MIN_DEPOSIT)}.`
        if (value > MAX_DEPOSIT) return `You can add up to ${formatMoney(MAX_DEPOSIT)} a day.`
        return null
      },
    },
  })

  const amount = typeof form.values.amount === 'number' ? form.values.amount : 0
  const monthly = goal.status === 'paused' ? 0 : goal.monthlyAmount
  const before = assumedReturn === undefined ? null : project({ value: goal.value, monthly, target: goal.target, annualReturnPct: assumedReturn })
  const after =
    assumedReturn === undefined || amount <= 0
      ? null
      : project({ value: goal.value + amount, monthly, target: goal.target, annualReturnPct: assumedReturn })
  const sooner = before?.reachedOn && after?.reachedOn && after.reachedOn < before.reachedOn

  const submit = form.onSubmit(async ({ amount: value }) => {
    if (addMoney.isPending) return
    setProblem(null)
    try {
      const before = progress(goal)
      const { goal: updated } = await addMoney.mutateAsync({ goalId: goal.id, amount: value as number })
      // Celebrate only a milestone this deposit actually crossed: the user's own progress.
      const milestone = crossedMilestone(before, progress(updated))
      track('money-added')
      const added = `${formatMoney(value as number)} added`
      notifications.show(
        milestone === null
          ? { title: 'Money added', message: `${added} to ${goal.name}` }
          : {
              title: milestoneMessage(milestone, goal.name),
              message: milestone >= 1 ? `${added}. Raise the target, or start a new goal.` : added,
              color: 'brand',
              autoClose: 5000,
            },
      )
      onDone({ from: before, milestone })
    } catch (error) {
      setProblem(
        toFormProblem(error, {
          fields: ['amount'],
          setFieldErrors: form.setErrors,
          gone: { title: 'This goal no longer exists', recover: { label: 'Close', onClick: onGone } },
        }),
      )
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <NumberInput data-autofocus label="Amount" prefix="$" min={0} decimalScale={2} {...form.getInputProps('amount')} />

        <Chip.Group
          value={QUICK_AMOUNTS.includes(amount) ? String(amount) : ''}
          onChange={(value) => form.setFieldValue('amount', Number(value))}
        >
          <Group gap="xs" aria-label="Quick amounts" role="group">
            {QUICK_AMOUNTS.map((quick) => (
              <Chip key={quick} value={String(quick)} size="sm" variant="outline">
                {formatMoney(quick)}
              </Chip>
            ))}
          </Group>
        </Chip.Group>

        <div className={classes.projection} aria-live="polite">
          <Text size="sm">
            {sooner && before?.reachedOn && after?.reachedOn ? (
              <>
                This moves {goal.name} from {formatMonthYear(before.reachedOn)} to <b>{formatMonthYear(after.reachedOn)}</b>.
              </>
            ) : (
              <>
                Every bit gets you closer to <span className={classes.figure}>{formatMoney(goal.target)}</span>.
              </>
            )}
          </Text>
        </div>
        <Text size="xs" c="dimmed">
          From Chase ••4821 · arrives in 1–2 business days
        </Text>

        {problem && <ProblemAlert problem={problem} />}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={addMoney.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={addMoney.isPending}>
            {amount > 0 ? `Add ${formatMoney(amount)}` : 'Add money'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
