import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Pagination,
  SegmentedControl,
  Skeleton,
  Table,
  Text,
  Title,
  UnstyledButton,
  VisuallyHidden,
} from '@mantine/core'
import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'

import { useCommitments, useFunds } from '../../api/queries.ts'
import type { Commitment, CommitmentSortField, CommitmentStatus, Currency } from '../../api/types.ts'
import { calledFraction, isValued } from '../../domain/commitments.ts'
import { formatDate, formatMoney, formatMoneyCompact, formatMultiple, formatPercent } from '../../domain/format.ts'
import { currencyOf, indexFunds } from '../../domain/funds.ts'
import classes from './CommitmentsTable.module.css'
import { applyChange, nextSort, PAGE_SIZE, parseTableParams, toSearchParams, type TableParams } from './tableParams.ts'

const COLUMN_COUNT = 8

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Pending close', value: 'pending_close' },
]

export function CommitmentsTable() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = parseTableParams(searchParams)
  // Replace rather than push: changing a filter or page shouldn't add a Back-button step.
  const update = (patch: Partial<TableParams>) => setSearchParams(toSearchParams(applyChange(params, patch)), { replace: true })

  // Paged on the server, so sorting covers every commitment, not just the visible 20.
  const commitments = useCommitments({
    pageSize: PAGE_SIZE,
    page: params.page,
    status: params.status ?? undefined,
    sort: params.sort,
    order: params.order,
  })
  // Needed to show each commitment in its fund's currency; the API doesn't say.
  const funds = useFunds()
  const fundsById = useMemo(() => indexFunds(funds.data?.data ?? []), [funds.data])

  const sortHeader = (field: CommitmentSortField, label: string, numeric = false) => (
    <SortableHeader field={field} label={label} numeric={numeric} params={params} onSort={(f) => update(nextSort(params, f))} />
  )

  let body: ReactNode
  if (commitments.isPending || funds.isPending) {
    body = Array.from({ length: 6 }, (_, row) => (
      <Table.Tr key={row}>
        {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
          <Table.Td key={cell}>
            <Skeleton height={12} width={cell === 0 ? '80%' : '60%'} />
          </Table.Td>
        ))}
      </Table.Tr>
    ))
  } else if (commitments.data && commitments.data.data.length === 0) {
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
            <Text size="sm" c="dimmed">
              No commitments match this filter.
            </Text>
          )}
          {params.page === 1 && params.status && (
            <Button size="xs" variant="default" mt="sm" onClick={() => update({ status: null })}>
              Show all
            </Button>
          )}
        </Table.Td>
      </Table.Tr>
    )
  } else if (commitments.data) {
    body = commitments.data.data.map((commitment) => (
      <CommitmentRow key={commitment.id} commitment={commitment} currency={currencyOf(commitment, fundsById)} />
    ))
  }

  const meta = commitments.data?.meta
  const shown = commitments.data?.data.length ?? 0
  const first = meta ? (meta.page - 1) * meta.pageSize + 1 : 0

  return (
    <Card padding={0}>
      <Group justify="space-between" align="flex-end" p="md" gap="sm">
        <div>
          <Title order={2} size="h4">
            Commitments
          </Title>
          <Text size="xs" c="dimmed">
            NAV and returns appear once a fund closes and reports.
          </Text>
        </div>
        <SegmentedControl
          size="xs"
          aria-label="Filter by status"
          data={STATUS_FILTERS}
          value={params.status ?? 'all'}
          onChange={(value) => update({ status: value === 'all' ? null : (value as CommitmentStatus) })}
        />
      </Group>

      {commitments.isError ? (
        <Alert color="red" variant="light" title="Couldn't load commitments" m="md" mt={0}>
          <Text size="sm" mb="sm">
            Check your connection and try again.
          </Text>
          <Button size="xs" variant="default" onClick={() => commitments.refetch()} loading={commitments.isRefetching}>
            Try again
          </Button>
        </Alert>
      ) : (
        <Table.ScrollContainer minWidth={820}>
          <Table className={classes.table}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fund</Table.Th>
                {sortHeader('dateCommitted', 'Committed on')}
                {sortHeader('committed', 'Committed', true)}
                {sortHeader('called', 'Called', true)}
                {sortHeader('nav', 'NAV', true)}
                {sortHeader('netIrrPct', 'Net IRR', true)}
                {sortHeader('netMoic', 'MOIC', true)}
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            {/* While a new sort or filter loads, the previous rows stay visible but dimmed. */}
            <Table.Tbody aria-busy={commitments.isFetching} data-stale={commitments.isPlaceholderData || undefined}>
              {body}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {meta && meta.totalPages > 1 && (
        <Group justify="space-between" px="md" py="sm" gap="sm" className={classes.footer}>
          <Text size="xs" c="dimmed">
            {shown > 0 ? (
              <>
                Showing <span className={classes.figure}>{first}–{first + shown - 1}</span> of{' '}
                <span className={classes.figure}>{meta.total}</span> commitments
              </>
            ) : (
              <>{meta.total} commitments</>
            )}
          </Text>
          <Pagination
            size="sm"
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

function CommitmentRow({ commitment: c, currency }: { commitment: Commitment; currency: Currency }) {
  const valued = isValued(c)
  const money = (amount: number) => (
    <span title={formatMoney(amount, currency)}>{formatMoneyCompact(amount, currency)}</span>
  )

  return (
    <Table.Tr>
      <Table.Td className={classes.fundCell}>
        <Text size="sm" fw={500} truncate="end" title={c.fundName}>
          {c.fundName}
        </Text>
        <Group gap={6} wrap="nowrap">
          <Text size="xs" c="dimmed" truncate="end" title={c.manager}>
            {c.strategy} · {c.manager}
          </Text>
          {currency !== 'USD' && (
            <Badge size="xs" variant="outline" color="gray" className={classes.currency}>
              {currency}
            </Badge>
          )}
        </Group>
      </Table.Td>
      <Table.Td className={classes.date}>{formatDate(c.dateCommitted)}</Table.Td>
      <Table.Td className={classes.numeric}>{money(c.committed)}</Table.Td>
      <Table.Td className={classes.numeric}>
        {money(c.called)} <span className={classes.share}>{Math.round(calledFraction(c) * 100)}%</span>
      </Table.Td>
      <Table.Td className={classes.numeric}>{valued && c.nav !== null ? money(c.nav) : <NotValued />}</Table.Td>
      <Table.Td className={classes.numeric}>
        {valued && c.netIrrPct !== null ? (
          <span data-tone={c.netIrrPct < 0 ? 'loss' : undefined}>{formatPercent(c.netIrrPct)}</span>
        ) : (
          <NotValued />
        )}
      </Table.Td>
      <Table.Td className={classes.numeric}>
        {valued && c.netMoic !== null ? (
          <span data-tone={c.netMoic < 1 ? 'loss' : undefined}>{formatMultiple(c.netMoic)}</span>
        ) : (
          <NotValued />
        )}
      </Table.Td>
      <Table.Td>
        {c.status === 'pending_close' ? (
          <Badge variant="outline" className={classes.pending} title="Not valued until the fund closes">
            Pending close
          </Badge>
        ) : (
          <Badge color="gray">Active</Badge>
        )}
      </Table.Td>
    </Table.Tr>
  )
}

/** A dash for sighted users, words for screen readers. */
function NotValued() {
  return (
    <span className={classes.notValued} title="Not valued until the fund closes and reports">
      <span aria-hidden="true">—</span>
      <VisuallyHidden>Not yet valued</VisuallyHidden>
    </span>
  )
}

interface SortableHeaderProps {
  field: CommitmentSortField
  label: string
  numeric: boolean
  params: TableParams
  onSort: (field: CommitmentSortField) => void
}

function SortableHeader({ field, label, numeric, params, onSort }: SortableHeaderProps) {
  const active = params.sort === field
  // The arrow's space is always reserved so labels don't shift when sorting. On
  // right-aligned (numeric) columns it goes on the left, so the label's right
  // edge lines up with the figures below.
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
