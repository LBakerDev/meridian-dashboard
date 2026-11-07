import { Button, Checkbox, Group, NumberInput, Stack, Text } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { isApiError } from '../../api/client.ts'
import { useCreateGoal } from '../../api/queries.ts'
import type { Goal, Portfolio } from '../../api/types.ts'
import { ACCOUNT } from '../../domain/account.ts'
import { formatMoney, formatMonthYear, formatShortDate } from '../../domain/format.ts'
import { project } from '../../domain/goals.ts'
import { ProblemAlert, toFormProblem, type FormProblem } from '../shared/formErrors.tsx'
import classes from './drawers.module.css'
import type { Basics } from './GoalBasics.tsx'

export const MAX_NAME_LENGTH = 40
export const MAX_MONTHLY = 10_000

interface FormValues {
  monthlyAmount: number | string
  acknowledged: boolean
}

const asNumber = (value: number | string) => (typeof value === 'number' ? value : null)

interface NewGoalFormProps {
  basics: Basics
  portfolio: Portfolio
  onCreated: (goal: Goal) => void
  onChangePortfolio: () => void
  onEditBasics: () => void
  onCancel: () => void
}

/** Step three of a new goal: how much each month, when you'd get there, and confirm. */
export function NewGoalForm({ basics, portfolio, onCreated, onChangePortfolio, onEditBasics, onCancel }: NewGoalFormProps) {
  const createGoal = useCreateGoal()
  const [problem, setProblem] = useState<FormProblem | null>(null)

  // Mirrors the server's rules so most mistakes are caught before sending.
  const form = useForm<FormValues>({
    initialValues: { monthlyAmount: '', acknowledged: false },
    validate: {
      monthlyAmount: (value) => {
        const amount = asNumber(value)
        if (amount === null) return 'Enter a monthly amount.'
        if (amount < portfolio.minMonthly) return `${portfolio.name} needs at least ${formatMoney(portfolio.minMonthly)} a month.`
        if (amount > MAX_MONTHLY) return `The most you can deposit monthly is ${formatMoney(MAX_MONTHLY)}.`
        return null
      },
      acknowledged: (value) => (value ? null : 'Confirm the monthly deposit to continue.'),
    },
  })

  const monthly = asNumber(form.values.monthlyAmount)
  const projection = monthly ? project({ value: 0, monthly, target: basics.target, annualReturnPct: portfolio.assumedReturnPct }) : null

  const submit = form.onSubmit(async (values) => {
    if (createGoal.isPending) return
    setProblem(null)
    try {
      const goal = await createGoal.mutateAsync({
        portfolioId: portfolio.id,
        name: basics.name,
        target: basics.target,
        monthlyAmount: asNumber(values.monthlyAmount),
        acknowledged: values.acknowledged,
      })
      notifications.show({
        title: `${goal.name} created`,
        message: goal.nextDepositDate ? `First deposit ${formatShortDate(goal.nextDepositDate)}` : 'Deposits start next month.',
      })
      onCreated(goal)
    } catch (error) {
      // The name and target were set in step one, so their errors send you back there.
      const detailErrors = isApiError(error) ? ['name', 'target'].map((f) => error.fields[f]).filter(Boolean) : []
      if (isApiError(error) && error.status === 400 && detailErrors.length) {
        setProblem({ title: 'Check your goal details', message: detailErrors.join(' '), recover: { label: 'Edit goal details', onClick: onEditBasics } })
        return
      }
      setProblem(
        toFormProblem(error, {
          fields: ['monthlyAmount', 'acknowledged'],
          setFieldErrors: form.setErrors,
          gone: { title: 'This portfolio is no longer available', recover: { label: 'Choose another portfolio', onClick: onChangePortfolio } },
        }),
      )
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <NumberInput
          data-autofocus
          label="Each month"
          description={`From ${formatMoney(portfolio.minMonthly)}`}
          prefix="$"
          min={0}
          {...form.getInputProps('monthlyAmount')}
        />

        <div className={classes.projection} aria-live="polite">
          {projection?.reachedOn && monthly ? (
            <Text size="sm">
              At <span className={classes.figure}>{formatMoney(monthly)}</span> a month you'd reach{' '}
              <span className={classes.figure}>{formatMoney(basics.target)}</span> around <b>{formatMonthYear(projection.reachedOn)}</b>.
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              Enter a monthly amount to see when you'd get there.
            </Text>
          )}
          <Text size="xs" c="dimmed" mt={4}>
            Assumes {portfolio.assumedReturnPct}% a year. Returns aren't guaranteed.
          </Text>
        </div>

        <Checkbox
          label={
            monthly
              ? `Take ${formatMoney(monthly)} from ${ACCOUNT.bank} on the 1st of each month`
              : `Take the monthly amount from ${ACCOUNT.bank} on the 1st of each month`
          }
          {...form.getInputProps('acknowledged', { type: 'checkbox' })}
        />

        {problem && <ProblemAlert problem={problem} />}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={createGoal.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={createGoal.isPending}>
            Create goal
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
