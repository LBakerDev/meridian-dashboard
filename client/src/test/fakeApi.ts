import type { Activity, Goal, HistoryPoint, Overview, Portfolio } from '../api/types.ts'
import { makeActivity, makeGoal, makeHistory, makeOverview, makePage, makePortfolio } from './factories.ts'
import { jsonResponse, routeFetch, type FetchCall } from './http.ts'

export interface FakeData {
  overview?: Overview
  history?: HistoryPoint[]
  portfolios?: Portfolio[]
  goals?: Goal[]
  activity?: Activity[]
}

type Handler = (call: FetchCall) => Response | Promise<Response> | undefined

/**
 * Answers every GET the page makes from `data` (with sensible defaults), and
 * hands writes to `onWrite`. Activity honours type, goalId, page and pageSize,
 * like the real server. Return undefined from `onWrite` to fall through to a 404.
 */
export function serveApi(data: FakeData = {}, onWrite?: Handler) {
  const {
    overview = makeOverview(),
    history = makeHistory(),
    portfolios = [makePortfolio()],
    goals = [makeGoal()],
    activity = [makeActivity()],
  } = data

  return routeFetch((call) => {
    if (call.method !== 'GET') return onWrite?.(call) ?? jsonResponse(404, { error: 'Endpoint not found.' })

    const [path, search = ''] = call.path.split('?')
    const query = new URLSearchParams(search)
    if (path === '/api/summary') return jsonResponse(200, overview)
    if (path === '/api/history') return jsonResponse(200, { data: history })
    if (path === '/api/portfolios') return jsonResponse(200, makePage(portfolios))
    if (path === '/api/goals') return jsonResponse(200, makePage(goals))
    if (path === '/api/activity') {
      const rows = activity
        .filter((a) => !query.get('type') || a.type === query.get('type'))
        .filter((a) => !query.get('goalId') || a.goalId === query.get('goalId'))
      const page = Number(query.get('page') ?? 1)
      const pageSize = Number(query.get('pageSize') ?? 25)
      return jsonResponse(200, {
        data: rows.slice((page - 1) * pageSize, page * pageSize),
        meta: { page, pageSize, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / pageSize)) },
      })
    }
    return jsonResponse(404, { error: 'Endpoint not found.' })
  })
}

/** The paths of the requests a fetch mock received, optionally only those starting with `prefix`. */
export function requestedPaths(fetchMock: ReturnType<typeof routeFetch>, prefix = '') {
  return fetchMock.mock.calls.map(([path]) => String(path)).filter((path) => path.startsWith(prefix))
}
