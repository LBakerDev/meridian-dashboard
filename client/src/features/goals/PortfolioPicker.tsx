import { Alert, Badge, Button, Group, Skeleton, Text, UnstyledButton } from '@mantine/core'

import { usePortfolios } from '../../api/queries.ts'
import type { Portfolio } from '../../api/types.ts'
import { formatMoney } from '../../domain/format.ts'
import { RiskDots } from '../shared/RiskDots.tsx'
import classes from './drawers.module.css'

/** A middle-of-the-road choice, flagged for people who aren't sure. */
const RECOMMENDED = 'balanced-60-40'

/** Step two of a new goal: where the money goes. Closed portfolios aren't offered. */
export function PortfolioPicker({ onSelect, selectedId = null }: { onSelect: (portfolio: Portfolio) => void; selectedId?: string | null }) {
  const portfolios = usePortfolios()

  if (portfolios.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading portfolios">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={classes.option}>
            <Skeleton height={14} width="55%" />
            <Skeleton height={10} width="70%" mt={8} />
          </div>
        ))}
      </div>
    )
  }

  if (portfolios.isError) {
    return (
      <Alert color="red" variant="light" title="Couldn't load portfolios">
        <Button size="xs" variant="default" onClick={() => portfolios.refetch()} loading={portfolios.isRefetching}>
          Try again
        </Button>
      </Alert>
    )
  }

  const open = portfolios.data.filter((p) => p.status === 'open')
  if (open.length === 0) {
    return <Text c="dimmed">No portfolios are open to new goals right now.</Text>
  }

  return (
    <ul className={classes.options} aria-label="Portfolios">
      {open.map((portfolio) => (
        <li key={portfolio.id}>
          <UnstyledButton
            className={classes.option}
            data-selected={portfolio.id === selectedId || undefined}
            onClick={() => onSelect(portfolio)}
          >
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
              <Text fw={500} lineClamp={2} title={portfolio.name}>
                {portfolio.name}
                {portfolio.id === RECOMMENDED && (
                  <Badge size="xs" variant="light" ml={8} className={classes.tag}>
                    Good default
                  </Badge>
                )}
              </Text>
              <RiskDots risk={portfolio.risk} />
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              {portfolio.description}
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              {portfolio.category} · from <span className={classes.figure}>{formatMoney(portfolio.minMonthly)}</span>/mo ·{' '}
              <span className={classes.figure}>{portfolio.feePct}%</span> a year
            </Text>
          </UnstyledButton>
        </li>
      ))}
    </ul>
  )
}
