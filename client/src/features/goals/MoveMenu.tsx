import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import classes from './GoalList.module.css'

interface MoveMenuProps {
  name: string
  index: number
  count: number
  onMove: (to: number) => void
  onClose: () => void
}

/**
 * Reorder without dragging (WCAG 2.2, 2.5.7): opened by clicking a goal's grip.
 * Options that wouldn't move it are left out. Arrow keys, Home/End, Enter, Escape.
 */
export function MoveMenu({ name, index, count, onMove, onClose }: MoveMenuProps) {
  const last = count - 1
  const options = [
    { label: 'Move to top', to: 0, show: index > 0 },
    { label: 'Move up', to: index - 1, show: index > 0 },
    { label: 'Move down', to: index + 1, show: index < last },
    { label: 'Move to bottom', to: last, show: index < last },
  ].filter((option) => option.show)

  const [active, setActive] = useState(0)
  const items = useRef<(HTMLLIElement | null)[]>([])
  useEffect(() => {
    items.current.at(active)?.focus()
  }, [active])

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive((a) => (a + 1) % options.length),
      ArrowUp: () => setActive((a) => (a - 1 + options.length) % options.length),
      Home: () => setActive(0),
      End: () => setActive(options.length - 1),
      Enter: () => onMove(options[active].to),
      ' ': () => onMove(options[active].to),
      Escape: onClose,
      Tab: onClose,
    }
    const run = keys[event.key]
    if (!run) return
    event.preventDefault()
    run()
  }

  return (
    <ul className={classes.moveMenu} role="menu" aria-label={`Move ${name}`} data-move-menu onKeyDown={onKeyDown}>
      {options.map((option, i) => (
        <li
          key={option.label}
          ref={(el) => {
            items.current[i] = el
          }}
          role="menuitem"
          tabIndex={-1}
          onClick={() => onMove(option.to)}
        >
          {option.label}
        </li>
      ))}
    </ul>
  )
}
