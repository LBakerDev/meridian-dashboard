import { describe, expect, it } from 'vitest'

import { makeActivity } from '../../test/factories.ts'
import { groupActivity } from './groupActivity.ts'

const monthly = (id: string, goalName: string, amount: number, date = '2026-11-01') =>
  makeActivity({ id, date, goalId: `goal_${id}`, goalName, amount })
const oneOff = makeActivity({ id: 'x1', date: '2026-11-01', description: 'One-off deposit from Chase ••4821', recurring: undefined, amount: 250 })
const dividend = makeActivity({ id: 'd1', date: '2026-10-15', type: 'dividend', recurring: undefined, amount: 18.4 })

describe('groupActivity', () => {
  it("combines a day's monthly deposits into one line, ahead of the day's other entries", () => {
    const days = groupActivity([oneOff, monthly('1', 'House deposit', 500), monthly('2', 'Climate bet', 150), dividend], { complete: true })

    expect(days.map((d) => d.date)).toEqual(['2026-11-01', '2026-10-15'])
    const [first, second] = days[0].items
    expect(first).toMatchObject({ kind: 'monthly', total: 650 })
    expect(first.kind === 'monthly' && first.entries.map((a) => a.goalName)).toEqual(['House deposit', 'Climate bet'])
    expect(second).toEqual({ kind: 'entry', entry: oneOff })
  })

  it('leaves a lone monthly deposit as its own line', () => {
    const [day] = groupActivity([monthly('1', 'House deposit', 500)], { complete: true })
    expect(day.items).toEqual([{ kind: 'entry', entry: expect.objectContaining({ goalName: 'House deposit' }) }])
  })

  it('holds back the oldest day until the rest of it has loaded', () => {
    const rows = [dividend, monthly('1', 'House deposit', 500, '2026-10-01')]
    expect(groupActivity(rows, { complete: false }).map((d) => d.date)).toEqual(['2026-10-15'])
    expect(groupActivity(rows, { complete: true }).map((d) => d.date)).toEqual(['2026-10-15', '2026-10-01'])
  })

  it('never holds back the only day', () => {
    expect(groupActivity([dividend], { complete: false })).toHaveLength(1)
  })
})
