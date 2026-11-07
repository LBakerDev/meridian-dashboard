import { Text, VisuallyHidden } from '@mantine/core'
import { useElementSize } from '@mantine/hooks'
import { memo, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'

import type { HistoryPoint } from '../../api/types.ts'
import { formatMoney, formatSignedMoney } from '../../domain/format.ts'
import classes from './ValueChart.module.css'

const HEIGHT = 240
// `top` leaves room above the plot for the date pill that rides on the guide line.
const PAD = { left: 4, right: 52, top: 30, bottom: 26 }

/** "2025-12" → Dec 1, 2025 (local). */
const monthDate = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1)
}
// Formatters are built once: toLocaleDateString builds a new one on every call.
const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
const LONG = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short' })
export const monthLabel = (month: string, style: 'short' | 'long' = 'short') =>
  (style === 'long' ? LONG : SHORT).format(monthDate(month))
const monthOnly = (month: string) => MONTH.format(monthDate(month))

/**
 * Axis zoomed to the data rather than starting at $0, on clean steps of
 * 1, 2, 2.5 or 5 × a power of ten, so growth reads as growth.
 */
function niceScale(low: number, peak: number) {
  const rough = Math.max(peak - low, peak * 0.1, 1) / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = ([1, 2, 2.5, 5, 10].find((f) => f * magnitude >= rough) ?? 10) * magnitude
  const min = Math.max(0, Math.floor((low * 0.97) / step) * step)
  const max = Math.max(Math.ceil((peak * 1.02) / step) * step, min + step)
  return { step, min, max }
}

const axisLabel = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K` : `$${n}`

interface ValueChartProps {
  points: HistoryPoint[]
  /** Called with the month under the pointer (or keyboard focus), and null when it leaves. */
  onScrub?: (point: HistoryPoint | null) => void
}

/** Everything about the chart that depends only on the data and the width. */
function buildGeometry(points: HistoryPoint[], W: number) {
  const innerWidth = W - PAD.left - PAD.right
  const low = Math.min(...points.map((p) => Math.min(p.value, p.contributed)))
  const peak = Math.max(...points.map((p) => Math.max(p.value, p.contributed)))
  const { step, min, max } = niceScale(low, peak)
  const last = points.length - 1
  const x = (i: number) => PAD.left + (i / last) * innerWidth
  const y = (n: number) => PAD.top + (1 - (n - min) / (max - min)) * (HEIGHT - PAD.top - PAD.bottom)
  const coords = (key: 'value' | 'contributed') => points.map((p, i) => [x(i), y(p[key])] as const)
  const path = (pts: readonly (readonly [number, number])[]) =>
    pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('')
  const valueLine = path(coords('value'))
  const contributedLine = path(coords('contributed'))
  const band = `${valueLine}${path([...coords('contributed')].reverse()).replace(/^M/, 'L')}Z`
  const ticks: number[] = []
  for (let t = min; t <= max + step / 2; t += step) ticks.push(t)

  // Month labels spaced by pixels (about six at any width). The latest month is
  // always labelled; anything too close to it, or to the previous label, is dropped.
  const minGap = Math.max(64, innerWidth / 6)
  const labels: { i: number; text: string }[] = []
  for (let i = 0, prev = -Infinity; i < last; i++) {
    if (x(i) - prev >= minGap && x(last) - x(i) >= minGap) {
      labels.push({ i, text: '' })
      prev = x(i)
    }
  }
  labels.push({ i: last, text: '' })
  for (const label of labels) {
    const month = points[label.i].month
    const withYear = label.i === 0 || monthDate(month).getMonth() === 0
    label.text = monthOnly(month) + (withYear ? ` ’${month.slice(2, 4)}` : '')
  }

  const first = points[0]
  const end = points[last]
  const summary =
    `Value ${end.value >= first.value ? 'grew' : 'fell'} from ${formatMoney(first.value)} in ${monthLabel(first.month, 'long')} ` +
    `to ${formatMoney(end.value)} in ${monthLabel(end.month, 'long')}. You put in ${formatMoney(end.contributed)} in total. ` +
    'Use the arrow keys to read a month.'

  return { W, innerWidth, last, x, y, ticks, labels, valueLine, contributedLine, band, summary, plotTop: PAD.top, plotBottom: HEIGHT - PAD.bottom, endY: y(end.value) }
}

type Geometry = ReturnType<typeof buildGeometry>

/**
 * The parts that don't move while scrubbing: grid, axes, band, lines and the
 * live dot. Memoized, so moving the pointer re-renders only the guide line.
 */
const StaticLayers = memo(function StaticLayers({ g, clipId }: { g: Geometry; clipId: string }) {
  return (
    <>
      <defs>
        <clipPath id={`${clipId}-above`}>
          <path d={`${g.contributedLine}L${g.x(g.last)},${g.plotTop}L${g.x(0)},${g.plotTop}Z`} />
        </clipPath>
        <clipPath id={`${clipId}-below`}>
          <path d={`${g.contributedLine}L${g.x(g.last)},${g.plotBottom}L${g.x(0)},${g.plotBottom}Z`} />
        </clipPath>
      </defs>

      {g.ticks.map((tick) => (
        <g key={tick}>
          <line className={classes.grid} x1={PAD.left} x2={g.W - PAD.right} y1={g.y(tick)} y2={g.y(tick)} />
          <text className={classes.axis} x={g.W - PAD.right + 10} y={g.y(tick) + 4}>
            {axisLabel(tick)}
          </text>
        </g>
      ))}
      {g.labels.map(({ i, text }) => (
        <text key={i} className={classes.axis} x={g.x(i)} y={HEIGHT - 6} textAnchor={i === 0 ? 'start' : i === g.last ? 'end' : 'middle'}>
          {text}
        </text>
      ))}

      {/* The growth: green where value is above what was put in, red where it dipped below. */}
      <g className={classes.reveal}>
        <path className={classes.gainBand} d={g.band} clipPath={`url(#${clipId}-above)`} />
        <path className={classes.lossBand} d={g.band} clipPath={`url(#${clipId}-below)`} />
      </g>
      <path className={classes.contributed} d={g.contributedLine} />
      <path className={classes.value} d={g.valueLine} pathLength={1} />

      {/* The latest point, pulsing a few times after load: the data is live. */}
      <g className={classes.revealLate}>
        <circle className={classes.pulse} cx={g.x(g.last)} cy={g.endY} r={5} />
        <circle className={classes.dot} cx={g.x(g.last)} cy={g.endY} r={4.5} />
      </g>
    </>
  )
})

/**
 * Value over time against what was put in. The shaded band between the lines is
 * the growth (green above, red where value dipped below). Scrubbing, by mouse or
 * arrow keys, reports the month to `onScrub` so the headline can show it, with
 * the month itself in a small pill at the top of the guide line.
 *
 * Kept cheap to scrub: the geometry is computed once per data and width, the
 * static layers don't re-render, and nothing updates unless the month changes.
 */
export const ValueChart = memo(function ValueChart({ points, onScrub }: ValueChartProps) {
  const { ref, width } = useElementSize()
  const [active, setActive] = useState<number | null>(null)
  // The month on screen, read by the mouse handler so it can skip moves within the same month.
  const activeRef = useRef<number | null>(null)
  // What screen readers hear. Set only from the keyboard, so mouse movement isn't read out.
  const [announcement, setAnnouncement] = useState('')
  const clipId = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  // jsdom (and the first paint) report width 0; draw at a sensible width until measured.
  const W = Math.max(320, width || 640)
  const g = useMemo(() => (points.length < 2 ? null : buildGeometry(points, W)), [points, W])

  if (!g) {
    return (
      <Text size="sm" c="dimmed" py="xl" ta="center">
        Your chart starts after your first month of deposits.
      </Text>
    )
  }
  const { last, x, y, innerWidth, plotBottom } = g

  const select = (index: number | null, { announce = false } = {}) => {
    if (index !== activeRef.current) {
      activeRef.current = index
      setActive(index)
      onScrub?.(index === null ? null : points[index])
    }
    if (announce && index !== null) {
      const p = points[index]
      setAnnouncement(
        `${monthLabel(p.month, 'long')}: value ${formatMoney(p.value)}, put in ${formatMoney(p.contributed)}, ` +
          `${formatSignedMoney(Math.round(p.value - p.contributed))}.`,
      )
    }
  }

  const indexAt = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width) return last // not laid out yet (or in tests)
    const px = ((event.clientX - rect.left) / rect.width) * W
    return Math.max(0, Math.min(last, Math.round(((px - PAD.left) / innerWidth) * last)))
  }

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'Escape') {
      select(null)
      return
    }
    const current = active ?? last
    const next =
      event.key === 'ArrowLeft' ? current - 1
      : event.key === 'ArrowRight' ? current + 1
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null
    if (next === null) return
    event.preventDefault()
    select(Math.max(0, Math.min(last, next)), { announce: true })
  }

  const point = active === null ? null : points[active]
  // The pill's width is estimated from its text, so it works without measuring the DOM.
  const pill = point ? monthLabel(point.month) : ''
  const pillWidth = pill.length * 6.6 + 20
  const pillX = active === null ? 0 : Math.min(Math.max(x(active), PAD.left + pillWidth / 2), W - PAD.right - pillWidth / 2)

  return (
    <div ref={ref} className={classes.chart}>
      <svg
        className={classes.svg}
        viewBox={`0 0 ${W} ${HEIGHT}`}
        role="img"
        aria-label={g.summary}
        tabIndex={0}
        data-scrubbing={active !== null || undefined}
        onMouseMove={(event) => select(indexAt(event))}
        onMouseLeave={() => select(null)}
        onFocus={() => select(last, { announce: true })}
        onBlur={() => select(null)}
        onKeyDown={onKeyDown}
      >
        <StaticLayers g={g} clipId={clipId} />

        {active !== null && point && (
          <g data-testid="scrubber">
            <line className={classes.cursor} x1={x(active)} x2={x(active)} y1={22} y2={plotBottom} />
            <circle className={classes.dot} cx={x(active)} cy={y(point.value)} r={5} />
            <rect className={classes.pill} x={pillX - pillWidth / 2} y={2} width={pillWidth} height={20} rx={10} />
            <text className={classes.pillText} x={pillX} y={12} textAnchor="middle" dominantBaseline="central">
              {pill}
            </text>
          </g>
        )}
      </svg>
      <VisuallyHidden role="status">{announcement}</VisuallyHidden>
    </div>
  )
})
