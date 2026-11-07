import { describe, expect, it } from 'vitest'

import { makeGoal } from '../test/factories.ts'
import { crossedMilestone, GOAL_COLORS, goalColor, hasStarted, milestoneMessage, progress, project, projectGoal, riskLabel } from './goals.ts'

const today = new Date(2026, 10, 5) // Nov 5, 2026

describe('hasStarted', () => {
  it('is true once money has gone in', () => {
    expect(hasStarted(makeGoal())).toBe(true)
  })

  it('is false for a new goal, even though the API sends zeros rather than blanks', () => {
    expect(hasStarted(makeGoal({ status: 'scheduled', contributed: 0, value: 0, returnPct: 0 }))).toBe(false)
  })
})

describe('progress', () => {
  it('is value over target', () => {
    expect(progress(makeGoal({ value: 5_000, target: 20_000 }))).toBe(0.25)
  })

  it('stops at 1 once the target is passed', () => {
    expect(progress(makeGoal({ value: 25_000, target: 20_000 }))).toBe(1)
  })

  it('is 0 for a zero target rather than dividing by zero', () => {
    expect(progress(makeGoal({ value: 100, target: 0 }))).toBe(0)
  })
})

describe('project', () => {
  it('counts months of deposits with no growth', () => {
    const result = project({ value: 0, monthly: 500, target: 6_000, annualReturnPct: 0 }, today)
    expect(result.months).toBe(12)
    expect(result.reachedOn).toEqual(new Date(2027, 10, 1)) // Nov 2027
  })

  it('gets there sooner with growth', () => {
    const flat = project({ value: 7_000, monthly: 500, target: 20_000, annualReturnPct: 0 }, today)
    const growing = project({ value: 7_000, monthly: 500, target: 20_000, annualReturnPct: 7 }, today)
    expect(growing.months!).toBeLessThan(flat.months!)
  })

  it('is now when the target is already met', () => {
    expect(project({ value: 21_000, monthly: 500, target: 20_000, annualReturnPct: 7 }, today)).toEqual({
      reachedOn: new Date(2026, 10, 1),
      months: 0,
    })
  })

  it('has no date when nothing goes in and nothing grows', () => {
    expect(project({ value: 0, monthly: 0, target: 5_000, annualReturnPct: 7 }, today)).toEqual({ reachedOn: null, months: null })
  })

  it('gives up rather than projecting past 50 years', () => {
    expect(project({ value: 0, monthly: 1, target: 10_000_000, annualReturnPct: 0 }, today).reachedOn).toBeNull()
  })
})

describe('projectGoal', () => {
  it('leaves out monthly deposits while a goal is paused', () => {
    const active = makeGoal({ value: 7_000, target: 20_000, monthlyAmount: 500 })
    const paused = { ...active, status: 'paused' as const }
    expect(projectGoal(paused, 7, today).months!).toBeGreaterThan(projectGoal(active, 7, today).months!)
  })
})

describe('riskLabel', () => {
  it('turns the 1–5 level into words', () => {
    expect(riskLabel(1)).toBe('Lowest risk')
    expect(riskLabel(4)).toBe('Higher risk')
  })
})

describe('goalColor', () => {
  it('always gives the same goal the same color', () => {
    expect(goalColor('goal_0001')).toBe(goalColor('goal_0001'))
    expect(GOAL_COLORS).toContain(goalColor('goal_0042'))
  })

  it('spreads goals across the palette', () => {
    const colors = new Set(['goal_0001', 'goal_0002', 'goal_0003', 'goal_0004', 'goal_0005'].map(goalColor))
    expect(colors.size).toBeGreaterThan(2)
  })
})

describe('crossedMilestone', () => {
  it('names the milestone a deposit crossed', () => {
    expect(crossedMilestone(0.43, 0.53)).toBe(0.5)
    expect(crossedMilestone(0.2, 0.25)).toBe(0.25) // landing exactly on it counts
  })

  it('picks the highest when one deposit jumps several', () => {
    expect(crossedMilestone(0.2, 0.8)).toBe(0.75)
    expect(crossedMilestone(0.9, 1)).toBe(1)
  })

  it('is null when nothing was crossed, or progress went down', () => {
    expect(crossedMilestone(0.3, 0.4)).toBeNull()
    expect(crossedMilestone(0.6, 0.4)).toBeNull()
  })
})

describe('milestoneMessage', () => {
  it('reads naturally for each milestone', () => {
    expect(milestoneMessage(0.25, 'Travel')).toBe('A quarter of the way to Travel')
    expect(milestoneMessage(0.5, 'Travel')).toBe('Halfway to Travel')
    expect(milestoneMessage(1, 'Travel')).toBe('Travel: target reached')
  })
})
