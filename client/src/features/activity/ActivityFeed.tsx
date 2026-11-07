import { Alert, Button, Card, Group, SegmentedControl, Select, Skeleton, Text, Title, UnstyledButton, VisuallyHidden } from '@mantine/core'
import { useId, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'

import { useActivityFeed, useGoals } from '../../api/queries.ts'
import type { Activity, ActivityType } from '../../api/types.ts'
import { ACCOUNT } from '../../domain/account.ts'
import { formatDay, formatSignedMoney } from '../../domain/format.ts'
import { goalColor } from '../../domain/goals.ts'
import classes from './ActivityFeed.module.css'
import { parseActivityParams, toSearchParams, type ActivityParams } from './activityParams.ts'
import { groupActivity, type FeedItem } from './groupActivity.ts'

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Deposits', value: 'deposit' },
  { label: 'Dividends', value: 'dividend' },
  { label: 'Fees', value: 'fee' },
  { label: 'Withdrawals', value: 'withdrawal' },
]

const TYPE_LABEL: Record<ActivityType, string> = {
  deposit: 'Deposit',
  dividend: 'Dividend',
  fee: 'Fee',
  withdrawal: 'Withdrawal',
}

const ICON: Record<ActivityType, string> = { deposit: '↓', dividend: '✦', fee: '%', withdrawal: '↑' }

const EMPTY_TEXT: Record<ActivityType, string> = {
  deposit: 'No deposits yet.',
  dividend: 'No dividends yet.',
  fee: 'No fees yet.',
  withdrawal: 'No withdrawals yet.',
}

const ALL_GOALS = 'all'

/**
 * Everything that's happened, newest first, grouped by day. Each month's
 * scheduled deposits share one line that opens to show each goal's share.
 */
export function ActivityFeed() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = parseActivityParams(searchParams)
  // Replace rather than push: changing a filter shouldn't add a Back-button step.
  const update = (patch: Partial<ActivityParams>) => setSearchParams(toSearchParams({ ...params, ...patch }), { replace: true })

  const goals = useGoals()
  // A goal in the URL that no longer exists (deleted, closed, mistyped) shows everything.
  const goalId = goals.data && params.goalId && !goals.data.some((g) => g.id === params.goalId) ? null : params.goalId

  const feed = useActivityFeed({ type: params.type ?? undefined, goalId: goalId ?? undefined })
  const rows = feed.data?.pages.flatMap((page) => page.data) ?? []
  const days = groupActivity(rows, { complete: !feed.hasNextPage })

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })

  const filtered = params.type !== null || goalId !== null

  let body: ReactNode
  if (feed.isError) {
    body = (
      <Alert color="red" variant="light" title="Couldn't load activity" m="md">
        <Text size="sm" mb="sm">
          Check your connection and try again.
        </Text>
        <Button size="xs" variant="default" onClick={() => feed.refetch()} loading={feed.isRefetching}>
          Try again
        </Button>
      </Alert>
    )
  } else if (feed.isPending) {
    body = <FeedSkeleton />
  } else if (days.length === 0) {
    body = (
      <div className={classes.empty}>
        <Text size="sm" c="dimmed">
          {params.type ? EMPTY_TEXT[params.type] : filtered ? 'Nothing for this goal yet.' : 'No activity yet. Your first deposit will show here.'}
        </Text>
        {filtered && (
          <Button size="xs" variant="default" mt="sm" onClick={() => update({ type: null, goalId: null })}>
            Show all
          </Button>
        )}
      </div>
    )
  } else {
    body = (
      // While a new filter loads, the previous feed stays visible but dimmed.
      <div aria-busy={feed.isFetching} data-stale={feed.isPlaceholderData || undefined} className={classes.feed}>
        {days.map((day) => (
          <div key={day.date} className={classes.day}>
            <Title order={3} className={classes.dayHeading}>
              {formatDay(day.date)}
            </Title>
            <ul className={classes.list}>
              {day.items.map((item) => (
                <FeedLine key={item.kind === 'monthly' ? item.key : item.entry.id} item={item} expanded={expanded} onToggle={toggle} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card component="section" aria-labelledby="activity-heading" padding={0}>
      <Group justify="space-between" p="md" px="lg" gap="sm" className={classes.header}>
        <Title id="activity-heading" order={2} size="h4">
          Activity
        </Title>
        <Group gap="xs" wrap="wrap">
          <Select
            size="xs"
            radius="xl"
            w={170}
            aria-label="Filter by goal"
            allowDeselect={false}
            withCheckIcon={false}
            data={[{ value: ALL_GOALS, label: 'All goals' }, ...(goals.data ?? []).map((g) => ({ value: g.id, label: g.name }))]}
            value={goalId ?? ALL_GOALS}
            onChange={(value) => update({ goalId: !value || value === ALL_GOALS ? null : value })}
            // Opens below the button, lined up with its right edge, rather than over it.
            comboboxProps={{ position: 'bottom-end', width: 220, shadow: 'md' }}
            renderOption={({ option, checked }) => (
              <span className={classes.option}>
                {option.value === ALL_GOALS ? <span className={classes.goalDot} /> : <span className={classes.goalDot} style={{ background: goalColor(option.value) }} />}
                <span className={classes.optionLabel}>{option.label}</span>
                {checked && <span aria-hidden="true">✓</span>}
              </span>
            )}
          />
          <SegmentedControl
            size="xs"
            aria-label="Filter activity"
            data={FILTERS}
            value={params.type ?? 'all'}
            onChange={(value) => update({ type: value === 'all' ? null : (value as ActivityType) })}
          />
        </Group>
      </Group>

      {body}

      {!feed.isError && days.length > 0 && (
        <div className={classes.footer}>
          {feed.hasNextPage ? (
            <Button size="xs" variant="default" radius="xl" onClick={() => feed.fetchNextPage()} loading={feed.isFetchingNextPage}>
              Show more
            </Button>
          ) : (
            <Text size="xs" c="dimmed">
              That's everything
            </Text>
          )}
        </div>
      )}
    </Card>
  )
}

interface FeedLineProps {
  item: FeedItem
  expanded: ReadonlySet<string>
  onToggle: (key: string) => void
}

function FeedLine({ item, expanded, onToggle }: FeedLineProps) {
  if (item.kind === 'monthly') return <MonthlyDeposits item={item} open={expanded.has(item.key)} onToggle={() => onToggle(item.key)} />
  return (
    <li className={classes.row}>
      <EntryContent entry={item.entry} />
      <span aria-hidden="true" />
    </li>
  )
}

/** A single entry, led by its goal. Fees aren't tied to a goal, so they lead with what they are. */
function EntryContent({ entry }: { entry: Activity }) {
  return (
    <>
      <TypeIcon type={entry.type} />
      <span className={classes.main}>
        <span className={classes.title}>{entry.goalName ?? entry.description}</span>
        <span className={classes.sub}>{entry.goalName ? entry.description : 'All goals'}</span>
      </span>
      <span className={classes.amount} data-type={entry.type}>
        <VisuallyHidden>{TYPE_LABEL[entry.type]}, </VisuallyHidden>
        {formatSignedMoney(entry.amount)}
      </span>
    </>
  )
}

function MonthlyDeposits({ item, open, onToggle }: { item: Extract<FeedItem, { kind: 'monthly' }>; open: boolean; onToggle: () => void }) {
  const panelId = useId()
  return (
    <li>
      <UnstyledButton className={classes.row} data-toggle aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={onToggle}>
        <TypeIcon type="deposit" />
        <span className={classes.main}>
          <span className={classes.title}>Monthly deposits</span>
          <span className={classes.sub}>
            {item.entries.length} goals · {ACCOUNT.bank}
          </span>
        </span>
        <span className={classes.amount}>{formatSignedMoney(item.total)}</span>
        <span className={classes.chevron} aria-hidden="true">
          ›
        </span>
      </UnstyledButton>
      {open && (
        <ul id={panelId} className={classes.children}>
          {item.entries.map((entry) => (
            <li key={entry.id}>
              <span className={classes.goalDot} style={entry.goalId ? { background: goalColor(entry.goalId) } : undefined} />
              <span className={classes.optionLabel}>{entry.goalName}</span>
              <span className={classes.amount}>{formatSignedMoney(entry.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function TypeIcon({ type }: { type: ActivityType }) {
  return (
    <span className={classes.icon} data-type={type} aria-hidden="true">
      {ICON[type]}
    </span>
  )
}

function FeedSkeleton() {
  return (
    <div className={classes.feed}>
      {[2, 1, 2].map((count, day) => (
        <div key={day} className={classes.day}>
          <Skeleton height={10} width={80} m="md" mx="lg" />
          {Array.from({ length: count }, (_, row) => (
            <Group key={row} gap="md" px="lg" py="xs" wrap="nowrap">
              <Skeleton circle height={30} />
              <div style={{ flex: 1 }}>
                <Skeleton height={12} width="40%" mb={6} />
                <Skeleton height={10} width="25%" />
              </div>
              <Skeleton height={12} width={60} />
            </Group>
          ))}
        </div>
      ))}
    </div>
  )
}
