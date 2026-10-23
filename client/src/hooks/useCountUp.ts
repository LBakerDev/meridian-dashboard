import { useReducedMotion } from '@mantine/hooks'
import { useEffect, useRef, useState } from 'react'

/** Long enough to register as motion, short enough never to feel slow. */
export const COUNT_UP_MS = 900

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

/**
 * Animates a number to `target`: from 0 on first render, then from wherever it
 * currently is whenever `target` changes. After a commit, the totals tick to
 * their new values, so you see the money land. Interrupting an animation
 * carries on from the displayed value rather than jumping.
 *
 * People who prefer reduced motion get the final value straight away.
 */
export function useCountUp(target: number, duration = COUNT_UP_MS): number {
  // Read synchronously, so reduced-motion users never see a first frame of counting.
  const reduceMotion = useReducedMotion(undefined, { getInitialValueInEffect: false })
  const [value, setValue] = useState(reduceMotion ? target : 0)
  const shown = useRef(value)

  useEffect(() => {
    if (reduceMotion) {
      shown.current = target
      setValue(target)
      return
    }
    const from = shown.current
    if (from === target) return

    let start: number | null = null
    let frame = requestAnimationFrame(function tick(now) {
      start ??= now
      const progress = Math.min(1, (now - start) / duration)
      shown.current = progress === 1 ? target : from + (target - from) * easeOutCubic(progress)
      setValue(shown.current)
      if (progress < 1) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [target, duration, reduceMotion])

  return value
}
