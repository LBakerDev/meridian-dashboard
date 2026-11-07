import type { ActivityType } from '../../api/types.ts'

/**
 * The activity feed's filters live in the URL (?type=dividend&goal=goal_0002),
 * so they survive a refresh and can be shared. These functions are the only
 * place that reads or writes them.
 */

export interface ActivityParams {
  type: ActivityType | null
  goalId: string | null
}

export const DEFAULT_ACTIVITY_PARAMS: ActivityParams = { type: null, goalId: null }

const TYPES: readonly ActivityType[] = ['deposit', 'dividend', 'fee', 'withdrawal']
const GOAL_ID = /^goal_\d+$/

/** Reads params from the URL. Anything missing or unrecognized falls back to the default. */
export function parseActivityParams(search: URLSearchParams): ActivityParams {
  const type = search.get('type')
  const goal = search.get('goal')
  return {
    type: TYPES.includes(type as ActivityType) ? (type as ActivityType) : null,
    goalId: goal && GOAL_ID.test(goal) ? goal : null,
  }
}

/** Writes params to the URL, leaving out defaults so the plain page URL stays plain. */
export function toSearchParams(params: ActivityParams): URLSearchParams {
  const search = new URLSearchParams()
  if (params.type) search.set('type', params.type)
  if (params.goalId) search.set('goal', params.goalId)
  return search
}
