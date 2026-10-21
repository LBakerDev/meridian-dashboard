import { Alert, Button, Checkbox, Group, NumberInput, Stack, Text, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { isApiError } from '../../api/client.ts'
import { useCommitToFund } from '../../api/queries.ts'
import type { Fund } from '../../api/types.ts'
import { currencySymbol, formatMoney, formatMoneyCompact, formatPercent, localizeCurrencyInMessage } from '../../domain/format.ts'
import classes from './CommitForm.module.css'
import { CloseLabel } from './FundPicker.tsx'

interface CommitFormProps {
  fund: Fund
  /** Called after a successful commit, once the portfolio has refreshed. */
  onDone: () => void
  onChangeFund: () => void
  onCancel: () => void
}

interface FormValues {
  amount: number | string
  acknowledgedTerms: boolean
}

const FORM_FIELDS = ['amount', 'acknowledgedTerms']

/** A problem that isn't about one field. Shown above the buttons; what was typed stays. */
interface FormProblem {
  title: string
  message: string
  /** The fund itself is the problem (closed or gone), so offer another. */
  offerOtherFund: boolean
}

/** Step two of committing: amount and terms for the chosen fund. */
export function CommitForm({ fund, onDone, onChangeFund, onCancel }: CommitFormProps) {
  const commit = useCommitToFund()
  const [problem, setProblem] = useState<FormProblem | null>(null)
  const minimum = formatMoney(fund.minInvestment, fund.currency)

  // Mirrors the server's rules so most mistakes are caught without a round trip.
  // The server still has the final say; its errors land in the same places.
  const form = useForm<FormValues>({
    initialValues: { amount: '', acknowledgedTerms: false },
    validate: {
      amount: (value) => {
        if (value === '' || value === null) return 'Enter a commitment amount.'
        if (typeof value !== 'number' || value <= 0) return 'Amount must be a positive number.'
        if (value < fund.minInvestment) return `Minimum commitment for this fund is ${minimum}.`
        return null
      },
      acknowledgedTerms: (value) => (value ? null : 'You must acknowledge the fund terms to continue.'),
    },
  })

  const amount = typeof form.values.amount === 'number' ? form.values.amount : null

  const submit = form.onSubmit(async (values) => {
    if (commit.isPending) return
    setProblem(null)
    const committed = values.amount as number
    try {
      // mutateAsync (not mutate) so this still runs if the drawer is closed mid-request.
      await commit.mutateAsync({ fundId: fund.id, amount: committed, acknowledgedTerms: values.acknowledgedTerms })
      notifications.show({
        color: 'brand.7',
        title: 'Commitment submitted',
        message: `${formatMoneyCompact(committed, fund.currency)} to ${fund.name}. It's pending until the fund closes.`,
      })
      onDone()
    } catch (error) {
      handleError(error)
    }
  })

  function handleError(error: unknown) {
    if (!isApiError(error)) {
      setProblem({ title: 'Something went wrong', message: 'Please try again.', offerOtherFund: false })
      return
    }
    const fieldErrors = Object.entries(error.fields).filter(([field]) => FORM_FIELDS.includes(field))
    if (error.status === 400 && fieldErrors.length > 0) {
      // The server's minimum message always says "$"; show the fund's own currency.
      form.setErrors(
        Object.fromEntries(fieldErrors.map(([field, message]) => [field, localizeCurrencyInMessage(message, fund.currency)])),
      )
      return
    }
    if (error.status === 409) {
      setProblem({ title: 'This fund has closed', message: error.message, offerOtherFund: true })
    } else if (error.status === 404) {
      setProblem({ title: 'This fund is no longer available', message: 'It may have been withdrawn.', offerOtherFund: true })
    } else if (error.isNetworkError) {
      setProblem({
        title: "Couldn't reach the server",
        message: 'Nothing was submitted. Check your connection and try again.',
        offerOtherFund: false,
      })
    } else {
      setProblem({ title: 'Something went wrong', message: `${error.message} Please try again.`, offerOtherFund: false })
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="lg">
        <FundTerms fund={fund} />

        <NumberInput
          data-autofocus
          label="Commitment amount"
          description={`Minimum ${minimum}`}
          placeholder={fund.minInvestment.toLocaleString('en-US')}
          prefix={currencySymbol(fund.currency)}
          min={0}
          decimalScale={2}
          {...form.getInputProps('amount')}
        />

        <Checkbox
          label="I've read and accept the fund terms"
          description={`${fund.managementFeePct}% management fee and ${fund.carryPct}% carry, over a ${fund.fundTermYears}-year term. Capital is called over the ${fund.investmentPeriodYears}-year investment period.`}
          {...form.getInputProps('acknowledgedTerms', { type: 'checkbox' })}
        />

        {problem && (
          <Alert color="red" variant="light" title={problem.title} role="alert">
            <Text size="sm">{problem.message}</Text>
            {problem.offerOtherFund && (
              <Button size="xs" variant="default" mt="sm" onClick={onChangeFund}>
                Choose another fund
              </Button>
            )}
          </Alert>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={commit.isPending}>
            Cancel
          </Button>
          <Button type="submit" color="brand.7" loading={commit.isPending}>
            {amount && amount >= fund.minInvestment ? `Commit ${formatMoney(amount, fund.currency)}` : 'Commit'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

function FundTerms({ fund }: { fund: Fund }) {
  return (
    <div className={classes.terms}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <div>
          <Title order={3} size="h5">
            {fund.name}
          </Title>
          <Text size="xs" c="dimmed" mt={2}>
            {fund.strategy} · {fund.manager} · {fund.vintage} vintage
          </Text>
        </div>
        <CloseLabel fund={fund} />
      </Group>
      {fund.summary && (
        <Text size="sm" c="dimmed" mt="sm">
          {fund.summary}
        </Text>
      )}
      <dl className={classes.grid}>
        <Term label="Minimum" value={formatMoneyCompact(fund.minInvestment, fund.currency)} />
        <Term label="Target net IRR" value={formatPercent(fund.targetIrrPct)} />
        <Term label="Fees" value={`${fund.managementFeePct}% / ${fund.carryPct}%`} />
        <Term label="Fund size" value={formatMoneyCompact(fund.fundSize, fund.currency)} />
        <Term label="Investment period" value={`${fund.investmentPeriodYears} yrs`} />
        <Term label="Term" value={`${fund.fundTermYears} yrs`} />
      </dl>
    </div>
  )
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text component="dt" size="xs" c="dimmed">
        {label}
      </Text>
      <dd className={classes.value}>{value}</dd>
    </div>
  )
}
