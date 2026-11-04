import { Alert, Button, CloseButton, Group, Skeleton, Text, TextInput, UnstyledButton } from '@mantine/core'
import { useMemo, useState, type ReactNode } from 'react'

import { useAllCommitments, useFunds } from '../../api/queries.ts'
import type { Fund } from '../../api/types.ts'
import { formatDate, formatMoneyCompact, formatPercent } from '../../domain/format.ts'
import { closeInfo, holdingsByFund, inPickingOrder, type Holding } from '../../domain/funds.ts'
import classes from './FundPicker.module.css'

interface FundPickerProps {
  onSelect: (fund: Fund) => void
  /** Highlighted when coming back via "Change fund". */
  selectedId?: string | null
}

/** Step one of committing: choose from the funds accepting commitments, soonest close first. */
export function FundPicker({ onSelect, selectedId = null }: FundPickerProps) {
  const funds = useFunds()
  // Only for "You hold $X". If it fails, the list still works without it.
  const commitments = useAllCommitments()
  const [search, setSearch] = useState('')

  const open = useMemo(() => inPickingOrder(funds.data?.data ?? []), [funds.data])
  const holdings = useMemo(() => holdingsByFund(commitments.data?.data ?? []), [commitments.data])
  const query = search.trim().toLowerCase()
  const shown = query ? open.filter((fund) => matches(fund, query)) : open

  if (funds.isError) {
    return (
      <Alert color="red" variant="light" title="Couldn't load funds">
        <Text size="sm" mb="sm">
          Check your connection and try again.
        </Text>
        <Button size="xs" variant="default" onClick={() => funds.refetch()} loading={funds.isRefetching}>
          Try again
        </Button>
      </Alert>
    )
  }

  return (
    <div>
      <div className={classes.searchBar}>
        <TextInput
          data-autofocus
          aria-label="Search funds"
          placeholder="Search by fund, manager or strategy"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          rightSection={search && <CloseButton size="sm" aria-label="Clear search" onClick={() => setSearch('')} />}
        />
        {!funds.isPending && (
          <Text size="xs" c="dimmed" mt={8} aria-live="polite">
            {query ? `${shown.length} of ${open.length} funds` : `${open.length} funds accepting commitments`}
          </Text>
        )}
      </div>

      {funds.isPending ? (
        <div aria-busy="true" aria-label="Loading funds">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={classes.skeletonRow}>
              <Skeleton height={14} width="70%" />
              <Skeleton height={10} width="55%" mt={8} />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className={classes.empty}>
          <Text size="sm" c="dimmed">
            {query ? `No funds match “${search.trim()}”.` : 'No funds are accepting commitments right now.'}
          </Text>
          {query && (
            <Button size="xs" variant="default" mt="sm" onClick={() => setSearch('')}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <ul className={classes.list} aria-label="Funds accepting commitments">
          {shown.map((fund) => (
            <li key={fund.id}>
              <FundOption
                fund={fund}
                holding={holdings.get(fund.id)}
                selected={fund.id === selectedId}
                onSelect={() => onSelect(fund)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function matches(fund: Fund, query: string): boolean {
  return [fund.name, fund.manager, fund.strategy].some((text) => text.toLowerCase().includes(query))
}

interface FundOptionProps {
  fund: Fund
  holding: Holding | undefined
  selected: boolean
  onSelect: () => void
}

/**
 * Two lines: what the fund is and when it closes, then what it takes to join.
 * Manager, fees and terms appear in the next step, once a fund is chosen.
 */
function FundOption({ fund, holding, selected, onSelect }: FundOptionProps) {
  return (
    <UnstyledButton className={classes.option} data-selected={selected || undefined} onClick={onSelect}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Text size="sm" fw={500} lineClamp={2} title={fund.name}>
          {fund.name}
        </Text>
        <CloseLabel fund={fund} />
      </Group>
      <Group justify="space-between" wrap="nowrap" gap="sm" mt={4}>
        <Text size="xs" c="dimmed" className={classes.meta}>
          {fund.strategy} · Min {formatMoneyCompact(fund.minInvestment, fund.currency)} · Target{' '}
          {formatPercent(fund.targetIrrPct)}
        </Text>
        {holding && (
          <Text size="xs" c="dimmed" className={classes.meta}>
            You hold {formatMoneyCompact(holding.committed, fund.currency)}
          </Text>
        )}
      </Group>
    </UnstyledButton>
  )
}

/** When the fund closes, as quiet text: amber when it's close, dimmed otherwise. */
export function CloseLabel({ fund }: { fund: Fund }) {
  const { status, daysLeft } = closeInfo(fund)
  const date = formatDate(fund.closeDate)

  if (status === 'passed') {
    return (
      <Label title={`Listed to close ${date}; still accepting commitments`}>Past close date</Label>
    )
  }
  if (status === 'today') return <Label warning>Closes today</Label>
  if (status === 'soon') {
    return (
      <Label warning title={`Closes ${date}`}>
        {daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
      </Label>
    )
  }
  if (fund.stage === 'closing_soon') {
    return (
      <Label warning title={`Closes ${date}`}>
        Closing soon
      </Label>
    )
  }
  return <Label>Closes {date}</Label>
}

function Label({ warning = false, title, children }: { warning?: boolean; title?: string; children: ReactNode }) {
  return (
    <Text size="xs" c={warning ? undefined : 'dimmed'} fw={warning ? 500 : undefined} className={warning ? `${classes.closeLabel} ${classes.warning}` : classes.closeLabel} title={title}>
      {children}
    </Text>
  )
}
