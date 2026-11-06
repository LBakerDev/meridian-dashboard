import { Button, Checkbox, Group, NumberInput, Stack, Text, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { useCreateGoal } from '../../api/queries.ts'
import type { Goal, Portfolio } from '../../api/types.ts'
import { formatMoney, formatMonthYear, formatShortDate } from '../../domain/format.ts'
import { project } from '../../domain/goals.ts'
import { ProblemAlert, toFormProblem, type FormProblem } from '../shared/formErrors.tsx'
import { RiskDots } from '../shared/RiskDots.tsx'
import classes from './drawers.module.css'

export const MAX_NAME_LENGTH = 40
export const MAX_MONTHLY = 10_000
const FIELDS = ['name', 'target', 'monthlyAmount', 'acknowledged'] as const

interface FormValues {
  name: string
  target: number | string
  monthlyAmount: number | string
  acknowledged: boolean
}

const asNumber = (value: number | string) => (typeof value === 'number' ? value : null)

interface NewGoalFormProps {
  portfolio: Portfolio
  onCreated: (goal: Goal) => void
  onChangePortfolio: () => void
  onCancel: () => void
}

/** Step two of a new goal: name it, set a target and a monthly amount, see when you'd get there. */
export function NewGoalForm({ portfolio, onCreated, onChangePortfolio, onCancel }: NewGoalFormProps) {
  const createGoal = useCreateGoal()
  const [problem, setProblem] = useState<FormProblem | null>(null)

  // Mirrors the server's rules so most mistakes are caught before sending.
  const form = useForm<FormValues>({
    initialValues: { name: '', target: '', monthlyAmount: '', acknowledged: false },
    validate: {
      name: (value) =>
        !value.trim() ? 'Give your goal a name.' : value.trim().length > MAX_NAME_LENGTH ? `Keep the name under ${MAX_NAME_LENGTH} characters.` : null,
      target: (value) => (asNumber(value) === null || (value as number) < 100 ? 'Set a target of at least $100.' : null),
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

  const target = asNumber(form.values.target)
  const monthly = asNumber(form.values.monthlyAmount)
  const projection =
    target && monthly ? project({ value: 0, monthly, target, annualReturnPct: portfolio.assumedReturnPct }) : null

  const submit = form.onSubmit(async (values) => {
    if (createGoal.isPending) return
    setProblem(null)
    try {
      const goal = await createGoal.mutateAsync({
        portfolioId: portfolio.id,
        name: values.name.trim(),
        target: asNumber(values.target),
        monthlyAmount: asNumber(values.monthlyAmount),
        acknowledged: values.acknowledged,
      })
      notifications.show({
        title: 'Goal created',
        message: `${goal.name}${goal.nextDepositDate ? ` · first deposit ${formatShortDate(goal.nextDepositDate)}` : ''}`,
      })
      onCreated(goal)
    } catch (error) {
      setProblem(
        toFormProblem(error, {
          fields: FIELDS,
          setFieldErrors: form.setErrors,
          gone: { title: 'This portfolio is no longer available', recover: { label: 'Choose another portfolio', onClick: onChangePortfolio } },
        }),
      )
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <div className={classes.picked}>
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <Text fw={600} lineClamp={2}>
              {portfolio.name}
            </Text>
            <RiskDots risk={portfolio.risk} />
          </Group>
          <Text size="sm" c="dimmed" mt={6}>
            {portfolio.description} {portfolio.feePct}% a year.
          </Text>
        </div>

        <TextInput data-autofocus label="What's it for?" placeholder="e.g. Wedding" maxLength={60} {...form.getInputProps('name')} />

        <Group grow align="flex-start">
          <NumberInput label="Target" prefix="$" min={0} {...form.getInputProps('target')} />
          <NumberInput
            label="Each month"
            description={`From ${formatMoney(portfolio.minMonthly)}`}
            prefix="$"
            min={0}
            {...form.getInputProps('monthlyAmount')}
          />
        </Group>

        <div className={classes.projection} aria-live="polite">
          {projection?.reachedOn && target && monthly ? (
            <Text size="sm">
              At <span className={classes.figure}>{formatMoney(monthly)}</span> a month you'd reach{' '}
              <span className={classes.figure}>{formatMoney(target)}</span> around <b>{formatMonthYear(projection.reachedOn)}</b>.
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              Enter a target and a monthly amount to see when you'd get there.
            </Text>
          )}
          <Text size="xs" c="dimmed" mt={4}>
            Assumes {portfolio.assumedReturnPct}% a year. Returns aren't guaranteed.
          </Text>
        </div>

        <Checkbox
          label={
            monthly
              ? `Take ${formatMoney(monthly)} from Chase ••4821 on the 1st of each month`
              : 'Take the monthly amount from Chase ••4821 on the 1st of each month'
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
