import type { Goal, RiskLevel } from '../api/types.ts'

/**
 * Rules for goals. Plain functions over API data, so they're tested without
 * rendering anything.
 */

/** Progress checkpoints shown as notches on each goal's bar, as shares of the target. */
export const MILESTONES = [0.25, 0.5, 0.75] as const

/**
 * The milestone a change in progress crossed (0.25, 0.5, 0.75, or 1 for the target
 * itself), or null. If one deposit jumps several, the highest wins. Only ever
 * celebrates the user's own progress, never market moves.
 */
export function crossedMilestone(before: number, after: number): number | null {
  const crossed = [...MILESTONES, 1].filter((m) => before < m && after >= m)
  return crossed.length ? crossed[crossed.length - 1] : null
}

/** "Halfway to House deposit". */
export function milestoneMessage(milestone: number, goalName: string): string {
  if (milestone >= 1) return `${goalName}: target reached`
  const words: Record<number, string> = { 0.25: 'A quarter of the way', 0.5: 'Halfway', 0.75: 'Three-quarters of the way' }
  return `${words[milestone]} to ${goalName}`
}

/** Projections stop looking after this long ("more than 50 years" isn't useful). */
const MAX_MONTHS = 600

/**
 * Whether a goal has real numbers yet. A goal that hasn't had its first deposit
 * comes back with value 0 and return 0 (not null), so check what's been put in
 * rather than trusting the zeros.
 */
export function hasStarted(goal: Pick<Goal, 'contributed'>): boolean {
  return goal.contributed > 0
}

/** Share of the target reached, 0 to 1. Capped at 1 once the target is passed. */
export function progress(goal: Pick<Goal, 'value' | 'target'>): number {
  if (goal.target <= 0) return 0
  return Math.min(1, Math.max(0, goal.value / goal.target))
}

export interface Projection {
  /** First of the month the target is reached, or null if it won't be (e.g. no deposits). */
  reachedOn: Date | null
  /** Months from now, or null alongside reachedOn. 0 if the target is already met. */
  months: number | null
}

/**
 * When `value` reaches `target`, adding `monthly` at the start of each month and
 * growing at `annualReturnPct` a year. An estimate for planning, not a promise.
 */
export function project(
  { value, monthly, target, annualReturnPct }: { value: number; monthly: number; target: number; annualReturnPct: number },
  today: Date = new Date(),
): Projection {
  if (value >= target) return { reachedOn: startOfMonth(today, 0), months: 0 }
  const rate = annualReturnPct / 100 / 12
  if (monthly <= 0 && (rate <= 0 || value <= 0)) return { reachedOn: null, months: null }

  let balance = value
  for (let month = 1; month <= MAX_MONTHS; month++) {
    balance = balance * (1 + rate) + monthly
    if (balance >= target) return { reachedOn: startOfMonth(today, month), months: month }
  }
  return { reachedOn: null, months: null }
}

/** The projection for a goal as it stands. Paused goals only grow, without deposits. */
export function projectGoal(goal: Goal, annualReturnPct: number, today: Date = new Date()): Projection {
  return project(
    {
      value: goal.value,
      monthly: goal.status === 'paused' ? 0 : goal.monthlyAmount,
      target: goal.target,
      annualReturnPct,
    },
    today,
  )
}

const RISK_WORDS: Record<RiskLevel, string> = {
  1: 'Lowest risk',
  2: 'Lower risk',
  3: 'Medium risk',
  4: 'Higher risk',
  5: 'Highest risk',
}

/** "Higher risk", for screen readers and tooltips alongside the risk dots. */
export function riskLabel(risk: RiskLevel): string {
  return RISK_WORDS[risk]
}

/**
 * Each goal gets a color for its icon and progress bar. Picked from the goal id,
 * so a goal keeps its color when others are added or the list is re-ordered.
 */
export const GOAL_COLORS = ['#8b93ff', '#5eead4', '#fbbf24', '#4ade80', '#f472b6', '#60a5fa', '#fb923c'] as const

export function goalColor(goalId: string): string {
  let hash = 0
  for (const char of goalId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return GOAL_COLORS[hash % GOAL_COLORS.length]
}

function startOfMonth(from: Date, monthsAhead: number): Date {
  return new Date(from.getFullYear(), from.getMonth() + monthsAhead, 1)
}
