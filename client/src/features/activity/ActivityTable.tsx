import { Alert, Button, Card, Group, Pagination, SegmentedControl, Skeleton, Table, Text, Title, UnstyledButton } from '@mantine/core'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'

import { useActivity } from '../../api/queries.ts'
import type { Activity, ActivitySortField, ActivityType } from '../../api/types.ts'
import { formatDate, formatSignedMoney } from '../../domain/format.ts'
import classes from './ActivityTable.module.css'
import { applyChange, nextSort, PAGE_SIZE, parseActivityParams, toSearchParams, type ActivityParams } from './activityParams.ts'

const COLUMN_COUNT = 4

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Deposits', value: 'deposit' },
  { label: 'Dividends', value: 'dividend' },
  { label: 'Fees', value: 'fee' },
]

const EMPTY_TEXT: Record<ActivityType, string> = {
  deposit: 'No deposits yet.',
  dividend: 'No dividends yet.',
  fee: 'No fees yet.',
}

export function ActivityTable() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = parseActivityParams(searchParams)
  // Replace rather than push: changing a filter or page shouldn't add a Back-button step.
  const update = (patch: Partial<ActivityParams>) => setSearchParams(toSearchParams(applyChange(params, patch)), { replace: true })

  // Paged on the server, so sorting covers all activity, not just the visible page.
  const activity = useActivity({
    type: params.type ?? undefined,
    sort: params.sort,
    order: params.order,
    page: params.page,
    pageSize: PAGE_SIZE,
  })

  let body: ReactNode
  if (activity.isPending) {
    body = Array.from({ length: 6 }, (_, row) => (
      <Table.Tr key={row}>
        {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
          <Table.Td key={cell}>
            <Skeleton height={12} width={cell === 1 ? '70%' : '60%'} />
          </Table.Td>
        ))}
      </Table.Tr>
    ))
  } else if (activity.data && activity.data.data.length === 0) {
    body = (
      <Table.Tr>
        <Table.Td colSpan={COLUMN_COUNT} className={classes.empty}>
          {params.page > 1 ? (
            // A bookmarked or hand-edited URL can point past the last page.
            <>
              <Text size="sm" c="dimmed">
                There's nothing on page {params.page}.
              </Text>
              <Button size="xs" variant="default" mt="sm" onClick={() => update({ page: 1 })}>
                Go to first page
              </Button>
            </>
          ) : (
            <>
              <Text size="sm" c="dimmed">
                {params.type ? EMPTY_TEXT[params.type] : 'No activity yet. Your first deposit will show here.'}
              </Text>
              {params.type && (
                <Button size="xs" variant="default" mt="sm" onClick={() => update({ type: null })}>
                  Show all
                </Button>
              )}
            </>
          )}
        </Table.Td>
      </Table.Tr>
    )
  } else if (activity.data) {
    body = activity.data.data.map((entry) => <ActivityRow key={entry.id} entry={entry} />)
  }

  const meta = activity.data?.meta
  const shown = activity.data?.data.length ?? 0
  const first = meta ? (meta.page - 1) * meta.pageSize + 1 : 0

  return (
    <Card component="section" aria-labelledby="activity-heading" padding={0}>
      <Group justify="space-between" p="md" px="lg" gap="sm">
        <Title id="activity-heading" order={2} size="h4">
          Activity
        </Title>
        <SegmentedControl
          size="xs"
          aria-label="Filter activity"
          data={FILTERS}
          value={params.type ?? 'all'}
          onChange={(value) => update({ type: value === 'all' ? null : (value as ActivityType) })}
        />
      </Group>

      {activity.isError ? (
        <Alert color="red" variant="light" title="Couldn't load activity" m="md" mt={0}>
          <Text size="sm" mb="sm">
            Check your connection and try again.
          </Text>
          <Button size="xs" variant="default" onClick={() => activity.refetch()} loading={activity.isRefetching}>
            Try again
          </Button>
        </Alert>
      ) : (
        <Table.ScrollContainer minWidth={640}>
          {/* Fixed layout: widths come from the colgroup, not the rows on screen,
              so sorting or paging never shifts the columns. */}
          <Table className={classes.table} layout="fixed">
            <colgroup>
              <col className={classes.colDate} />
              <col />
              <col className={classes.colGoal} />
              <col className={classes.colAmount} />
            </colgroup>
            <Table.Thead>
              <Table.Tr>
                <SortableHeader field="date" label="Date" params={params} onSort={(f) => update(nextSort(params, f))} />
                <Table.Th>What</Table.Th>
                <Table.Th>Goal</Table.Th>
                <SortableHeader field="amount" label="Amount" numeric params={params} onSort={(f) => update(nextSort(params, f))} />
              </Table.Tr>
            </Table.Thead>
            {/* While a new filter, sort or page loads, the previous rows stay visible but dimmed. */}
            <Table.Tbody aria-busy={activity.isFetching} data-stale={activity.isPlaceholderData || undefined}>
              {body}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {meta && meta.totalPages > 1 && (
        <Group justify="space-between" px="lg" py="sm" gap="sm" className={classes.footer}>
          <Text size="xs" c="dimmed">
            {shown > 0 ? (
              <>
                Showing <span className={classes.figure}>{first}–{first + shown - 1}</span> of{' '}
                <span className={classes.figure}>{meta.total}</span>
              </>
            ) : (
              <>{meta.total} entries</>
            )}
          </Text>
          <Pagination
            size="sm"
            radius="xl"
            total={meta.totalPages}
            value={params.page}
            onChange={(page) => update({ page })}
            getItemProps={(page) => ({
              'aria-label': `Page ${page}`,
              'aria-current': page === params.page ? 'page' : undefined,
            })}
            getControlProps={(control) => ({
              'aria-label': control === 'previous' ? 'Previous page' : control === 'next' ? 'Next page' : `${control} page`,
            })}
          />
        </Group>
      )}
    </Card>
  )
}

function ActivityRow({ entry }: { entry: Activity }) {
  return (
    <Table.Tr>
      <Table.Td className={classes.date}>{formatDate(entry.date)}</Table.Td>
      <Table.Td>
        <span className={classes.what}>
          <i className={classes.dot} data-type={entry.type} aria-hidden="true" />
          <Text size="sm" component="span" truncate="end" title={entry.description}>
            {entry.description}
          </Text>
        </span>
      </Table.Td>
      <Table.Td className={classes.goal}>
        <Text size="sm" c="dimmed" truncate="end">
          {entry.goalName ?? '—'}
        </Text>
      </Table.Td>
      <Table.Td className={classes.numeric} data-type={entry.type}>
        {formatSignedMoney(entry.amount)}
      </Table.Td>
    </Table.Tr>
  )
}

interface SortableHeaderProps {
  field: ActivitySortField
  label: string
  numeric?: boolean
  params: ActivityParams
  onSort: (field: ActivitySortField) => void
}

function SortableHeader({ field, label, numeric = false, params, onSort }: SortableHeaderProps) {
  const active = params.sort === field
  // The arrow's space is always reserved so labels don't shift when sorting. On the
  // right-aligned amount column it goes on the left, so the label lines up with the figures.
  const arrow = (
    <span aria-hidden="true" className={classes.arrow}>
      {active ? (params.order === 'asc' ? '↑' : '↓') : ''}
    </span>
  )
  return (
    <Table.Th
      className={numeric ? classes.numeric : undefined}
      aria-sort={active ? (params.order === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <UnstyledButton className={classes.sortButton} data-active={active || undefined} onClick={() => onSort(field)}>
        {numeric && arrow}
        {label}
        {!numeric && arrow}
      </UnstyledButton>
    </Table.Th>
  )
}
