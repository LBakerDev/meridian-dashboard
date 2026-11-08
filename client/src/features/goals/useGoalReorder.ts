import { useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'

/** A mouse press becomes a drag only after it moves this far (a click doesn't move). */
const DRAG_DISTANCE = 6
/** On touch, a press this long picks a row up; a quicker swipe scrolls the page. */
const LONG_PRESS = 250
/** Within this distance of the window's top or bottom edge, a drag scrolls the page. */
const EDGE = 72

const moved = (list: string[], from: number, to: number) => {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
const same = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i])

interface Options {
  /** The current order, as the server has it. */
  ids: string[]
  nameOf: (id: string) => string
  /** Save a new order. Resolves when the page has caught up (or the save failed). */
  onReorder: (ids: string[]) => Promise<unknown>
}

/**
 * Reorder a list three ways, all ending in one save:
 *
 * - Drag: from anywhere on a row with a mouse (after a 6px move, so a click still
 *   opens it), a long press on touch, or straight away from the grip. The page
 *   scrolls near the window's edges; Escape cancels.
 * - Keyboard: on the grip, Space picks up, arrows move, Space drops, Escape cancels.
 * - A Move menu from clicking the grip (WCAG 2.2, 2.5.7: no dragging needed).
 *
 * Performance: a drag never touches React state while the pointer moves. Rows are
 * positioned by writing transforms directly, and React renders once, on drop.
 */
export function useGoalReorder({ ids, nameOf, onReorder }: Options) {
  const listRef = useRef<HTMLUListElement>(null)
  const helpId = useId()
  // Keyboard pick-up: a preview order until Space drops it (or Escape cancels).
  const [lift, setLift] = useState<{ ids: string[]; id: string; from: number } | null>(null)
  // The order just saved, shown until the server's list catches up, so nothing flickers back.
  const [held, setHeld] = useState<string[] | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const dragging = useRef(false)
  const focusAfter = useRef<string | null>(null)

  const order = lift?.ids ?? held ?? ids
  const count = order.length
  const position = (id: string, at: number) => `${nameOf(id)}, position ${at + 1} of ${count}`

  // Moving a row moves its grip in the DOM, which loses focus: put it back.
  useLayoutEffect(() => {
    const id = focusAfter.current
    if (!id) return
    focusAfter.current = null
    listRef.current?.querySelector<HTMLElement>(`[data-grip-id="${id}"]`)?.focus()
  })

  // While a touch drag is on, the page mustn't scroll under the finger.
  useEffect(() => {
    const block = (event: TouchEvent) => {
      if (dragging.current) event.preventDefault()
    }
    window.addEventListener('touchmove', block, { passive: false })
    return () => window.removeEventListener('touchmove', block)
  }, [])

  // The Move menu closes on a press anywhere else.
  useEffect(() => {
    if (!menuFor) return
    const close = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-move-menu]') && target.closest('[data-grip-id]')?.getAttribute('data-grip-id') !== menuFor) setMenuFor(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menuFor])

  const commit = (next: string[]) => {
    setHeld(next)
    void onReorder(next).finally(() => setHeld((current) => (current === next ? null : current)))
  }

  // ---- Pointer ----

  const startDrag = (index: number, startY: number) => {
    const list = listRef.current
    if (!list) return
    const rows = Array.from(list.children) as HTMLElement[]
    const row = rows.at(index)
    if (!row) return
    const height = row.offsetHeight
    const middles = rows.map((r) => r.offsetTop + r.offsetHeight / 2)
    const scrollAtStart = window.scrollY
    let to = index
    let lastY = startY
    let frame = 0

    dragging.current = true
    setMenuFor(null)
    row.dataset.dragging = ''
    rows.forEach((r, j) => {
      if (j !== index) r.dataset.settling = ''
    })
    document.body.dataset.reordering = ''

    // Measured in page terms (pointer + scroll), so auto-scroll keeps the row under the pointer.
    const place = () => {
      const dy = lastY - startY + (window.scrollY - scrollAtStart)
      row.style.transform = `translateY(${dy}px)`
      const centre = middles[index] + dy
      to = middles.reduce((n, m, j) => n + (j !== index && m < centre ? 1 : 0), 0)
      rows.forEach((r, j) => {
        if (j === index) return
        const shift = index < to && j > index && j <= to ? -height : to < index && j >= to && j < index ? height : 0
        r.style.transform = shift ? `translateY(${shift}px)` : ''
      })
    }
    const autoScroll = () => {
      const speed = lastY < EDGE ? -(EDGE - lastY) / 4 : lastY > window.innerHeight - EDGE ? (lastY - (window.innerHeight - EDGE)) / 4 : 0
      if (speed) {
        window.scrollBy(0, speed)
        place()
      }
      frame = requestAnimationFrame(autoScroll)
    }
    const onMove = (event: PointerEvent) => {
      lastY = event.clientY
      place()
    }
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        end(event)
      }
    }
    // Release is heard on the whole window; ending always clears every row.
    const end = (event: Event) => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      window.removeEventListener('blur', end)
      window.removeEventListener('keydown', onKey)
      dragging.current = false
      delete document.body.dataset.reordering
      rows.forEach((r) => {
        delete r.dataset.dragging
        delete r.dataset.settling
        r.style.transform = ''
      })
      // The release also fires a click; swallow that one so the goal doesn't open.
      const swallow = (click: globalThis.MouseEvent) => {
        click.stopPropagation()
        click.preventDefault()
      }
      window.addEventListener('click', swallow, true)
      setTimeout(() => window.removeEventListener('click', swallow, true), 0)

      // Indexes are positions on screen, which may be an order still being saved.
      const id = order.at(index)
      if (!id) return
      if (event.type === 'pointerup' && to !== index) {
        commit(moved(order, index, to))
        setAnnouncement(`${nameOf(id)} moved to position ${to + 1} of ${count}`)
      } else if (event.type === 'keydown') {
        setAnnouncement(`Cancelled. ${position(id, index)}.`)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('blur', end)
    window.addEventListener('keydown', onKey)
    frame = requestAnimationFrame(autoScroll)
  }

  /** On each row: decides whether a press is a click, a scroll or a drag. */
  const rowPointerDown = (index: number) => (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || dragging.current || lift) return
    const target = event.target as HTMLElement
    if (target.closest('[data-move-menu]')) return
    const onGrip = target.closest('[data-grip-id]') !== null
    const mouse = event.pointerType === 'mouse'
    const x0 = event.clientX
    const y0 = event.clientY
    let timer: ReturnType<typeof setTimeout> | undefined

    const stop = () => {
      clearTimeout(timer)
      window.removeEventListener('pointermove', watch)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    const begin = () => {
      stop()
      startDrag(index, y0)
    }
    const watch = (move: PointerEvent) => {
      const distance = Math.hypot(move.clientX - x0, move.clientY - y0)
      if ((mouse || onGrip) && distance >= DRAG_DISTANCE) begin()
      // A touch that moves before the long press is a scroll.
      else if (!mouse && !onGrip && distance > 8) stop()
    }

    if (mouse) event.preventDefault() // no text selection while deciding
    else if (!onGrip) timer = setTimeout(begin, LONG_PRESS)
    window.addEventListener('pointermove', watch)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }

  // ---- Keyboard ----

  const drop = () => {
    if (!lift) return
    const at = lift.ids.indexOf(lift.id)
    if (!same(lift.ids, ids)) commit(lift.ids)
    setLift(null)
    focusAfter.current = lift.id
    setAnnouncement(`Dropped ${position(lift.id, at)}.`)
  }

  const gripKeyDown = (id: string, index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const lifted = lift?.id === id
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (lifted) return drop()
      setMenuFor(null)
      setLift({ ids: order, id, from: index })
      setAnnouncement(`Picked up ${position(id, index)}. Arrow keys move it, Space drops it, Escape cancels.`)
    } else if (lifted && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      const at = lift.ids.indexOf(id)
      const to = Math.max(0, Math.min(count - 1, at + (event.key === 'ArrowUp' ? -1 : 1)))
      if (to === at) return
      setLift({ ...lift, ids: moved(lift.ids, at, to) })
      focusAfter.current = id
      setAnnouncement(position(id, to))
    } else if (lifted && event.key === 'Escape') {
      event.preventDefault()
      setLift(null)
      focusAfter.current = id
      setAnnouncement(`Cancelled. ${position(id, lift.from)}.`)
    }
  }

  // ---- Move menu ----

  const moveTo = (id: string, to: number) => {
    const from = order.indexOf(id)
    setMenuFor(null)
    focusAfter.current = id
    if (from === to || from < 0) return
    commit(moved(order, from, to))
    setAnnouncement(position(id, to))
  }

  const gripProps = (id: string, index: number) => ({
    'data-grip-id': id,
    'aria-label': `Reorder ${nameOf(id)}`,
    'aria-describedby': helpId,
    'aria-haspopup': 'menu' as const,
    'aria-expanded': menuFor === id,
    // A real click (not the keyboard's Space or Enter, which pick up) opens the Move menu.
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (event.detail === 0) return
      setMenuFor((open) => (open === id ? null : id))
    },
    onKeyDown: gripKeyDown(id, index),
    // Tabbing away while holding a goal drops it where it is.
    onBlur: (event: FocusEvent<HTMLButtonElement>) => {
      if (lift?.id === id && event.relatedTarget && !(event.relatedTarget as HTMLElement).closest('[data-grip-id]')) drop()
    },
  })

  // Once the server's order matches what we're holding, let go of it.
  useEffect(() => {
    if (held && same(held, ids)) setHeld(null)
  }, [held, ids])

  return {
    order,
    listRef,
    helpId,
    announcement,
    liftedId: lift?.id ?? null,
    menuFor,
    closeMenu: (id: string) => {
      setMenuFor(null)
      focusAfter.current = id
    },
    moveTo,
    rowPointerDown,
    gripProps,
  }
}
