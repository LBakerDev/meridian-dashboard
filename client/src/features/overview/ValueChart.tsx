import { Text } from '@mantine/core'
import { useElementSize } from '@mantine/hooks'
import { useId, useState, type KeyboardEvent, type MouseEvent } from 'react'

import type { HistoryPoint } from '../../api/types.ts'
import { formatMoney, formatSignedMoney } from '../../domain/format.ts'
import classes from './ValueChart.module.css'

const HEIGHT = 220
const PAD = { left: 4, right: 52, top: 10, bottom: 26 }

/** "2025-12" → Dec 1, 2025 (local). */
const monthDate = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1)
}
const monthName = (month: string, style: 'short' | 'long' = 'short') =>
  monthDate(month).toLocaleDateString('en-US', { month: style, ...(style === 'long' ? { year: 'numeric' } : {}) })

/** Axis steps of 1, 2, 2.5 or 5 × a power of ten, about four of them. */
function niceScale(peak: number) {
  const rough = Math.max(peak, 1) / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = ([1, 2, 2.5, 5, 10].find((f) => f * magnitude >= rough) ?? 10) * magnitude
  const max = Math.ceil((peak * 1.04) / step) * step || step
  return { step, max }
}

const axisLabel = (n: number) =>
  n === 0 ? '$0' : n >= 1000 ? `$${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K` : `$${n}`

/**
 * Value over time against what was put in. The gap between the solid and dashed
 * lines is the growth. Hover, or focus and use the arrow keys, to read a month.
 */
export function ValueChart({ points }: { points: HistoryPoint[] }) {
  const { ref, width } = useElementSize()
  const [active, setActive] = useState<number | null>(null)
  const gradientId = `value-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  if (points.length < 2) {
    return (
      <Text size="sm" c="dimmed" py="xl" ta="center">
        Your chart starts after your first month of deposits.
      </Text>
    )
  }

  // jsdom (and the first paint) report width 0; draw at a sensible width until measured.
  const W = Math.max(320, width || 640)
  const innerWidth = W - PAD.left - PAD.right
  const { step, max } = niceScale(Math.max(...points.map((p) => Math.max(p.value, p.contributed))))
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * innerWidth
  const y = (n: number) => PAD.top + (1 - n / max) * (HEIGHT - PAD.top - PAD.bottom)
  const line = (key: 'value' | 'contributed') =>
    points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join('')
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step)

  // Month labels spaced by pixels (about six at any width). The latest month is
  // always labelled; anything too close to it, or to the previous label, is dropped.
  const minGap = Math.max(64, innerWidth / 6)
  const labelled = new Set([points.length - 1])
  for (let i = 0, last = -Infinity; i < points.length - 1; i++) {
    if (x(i) - last >= minGap && x(points.length - 1) - x(i) >= minGap) {
      labelled.add(i)
      last = x(i)
    }
  }

  const first = points[0]
  const last = points[points.length - 1]
  const summary =
    `Value ${last.value >= first.value ? 'grew' : 'fell'} from ${formatMoney(first.value)} in ${monthName(first.month, 'long')} ` +
    `to ${formatMoney(last.value)} in ${monthName(last.month, 'long')}. You put in ${formatMoney(last.contributed)} in total.`

  const indexAt = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = ((event.clientX - rect.left) / rect.width) * W
    return Math.max(0, Math.min(points.length - 1, Math.round(((px - PAD.left) / innerWidth) * (points.length - 1))))
  }

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const current = active ?? points.length - 1
    const next =
      event.key === 'ArrowLeft' ? current - 1
      : event.key === 'ArrowRight' ? current + 1
      : event.key === 'Home' ? 0
      : event.key === 'End' ? points.length - 1
      : null
    if (next === null) return
    event.preventDefault()
    setActive(Math.max(0, Math.min(points.length - 1, next)))
  }

  const point = active === null ? null : points[active]

  return (
    <div ref={ref} className={classes.chart}>
      <svg
        className={classes.svg}
        viewBox={`0 0 ${W} ${HEIGHT}`}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onMouseMove={(event) => setActive(indexAt(event))}
        onMouseLeave={() => setActive(null)}
        onFocus={() => setActive((current) => current ?? points.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" className={classes.fillTop} />
            <stop offset="1" className={classes.fillBottom} />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className={classes.grid} x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text className={classes.axis} x={W - PAD.right + 10} y={y(tick) + 4}>
              {axisLabel(tick)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          labelled.has(i) ? (
            <text key={p.month} className={classes.axis} x={x(i)} y={HEIGHT - 6} textAnchor="middle">
              {monthName(p.month)}
              {i === 0 || monthDate(p.month).getMonth() === 0 ? ` ’${p.month.slice(2, 4)}` : ''}
            </text>
          ) : null,
        )}
        <path d={`${line('value')}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={`url(#${gradientId})`} />
        <path className={classes.contributed} d={line('contributed')} />
        <path className={classes.value} d={line('value')} />
        {active !== null && point && (
          <>
            <line className={classes.cursor} x1={x(active)} x2={x(active)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
            <circle className={classes.dot} cx={x(active)} cy={y(point.value)} r={4} />
          </>
        )}
      </svg>

      {active !== null && point && (
        <div
          className={classes.tooltip}
          style={{ left: Math.min(Math.max(x(active), 80), W - 80), top: y(point.value) }}
          role="status"
        >
          <strong>{monthName(point.month, 'long')}</strong>
          <span>
            Value <span className={classes.figure}>{formatMoney(point.value)}</span>
          </span>
          <span>
            Put in <span className={classes.figure}>{formatMoney(point.contributed)}</span>
          </span>
          <span className={classes.figure} data-tone={point.value >= point.contributed ? 'gain' : 'loss'}>
            {formatSignedMoney(Math.round(point.value - point.contributed))}
          </span>
        </div>
      )}
    </div>
  )
}
