import { useEffect, useState } from 'react'

import { MILESTONES } from '../../domain/goals.ts'
import classes from './GoalProgress.module.css'

interface GoalProgressProps {
  /** Progress toward the target, 0 to 1. */
  share: number
  /** Grow from this value on mount (after a deposit), instead of appearing at `share`. */
  from?: number
  /** A milestone just crossed (0.25, 0.5, 0.75 or 1): the bar glows and that notch flashes, once. */
  celebrate?: number | null
  /** Accessible name, e.g. "Progress to target". Omit when the parent already describes it. */
  label?: string
  size?: 'sm' | 'md'
}

/**
 * A goal's progress bar, split into quarters by subtle notches. In the goal's
 * color in dark mode (the parent sets `--goal`), ink in light mode. Width changes
 * animate, so a deposit visibly moves the bar; reduced motion turns that off.
 */
export function GoalProgress({ share, from, celebrate = null, label, size = 'md' }: GoalProgressProps) {
  // When `from` is given, start there and move to `share` on the next frame, so it animates.
  const [shown, setShown] = useState(from ?? share)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(share))
    return () => cancelAnimationFrame(frame)
  }, [share])

  const percent = Math.round(share * 100)
  return (
    <div
      className={classes.bar}
      data-size={size}
      data-celebrate={celebrate !== null || undefined}
      {...(label
        ? { role: 'progressbar', 'aria-label': label, 'aria-valuenow': percent, 'aria-valuemin': 0, 'aria-valuemax': 100 }
        : { 'aria-hidden': true })}
    >
      <span className={classes.fill} style={{ width: `${shown * 100}%` }} />
      {MILESTONES.map((m) => (
        <i
          key={m}
          className={classes.notch}
          style={{ left: `${m * 100}%` }}
          data-reached={share >= m || undefined}
          data-just={celebrate === m || undefined}
        />
      ))}
    </div>
  )
}
