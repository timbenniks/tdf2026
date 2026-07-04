import { describe, expect, it } from 'vitest'
import { GapTrendTracker } from './trends'
import { createEmptyState } from '@shared/types'
import type { LiveRaceState, RaceGroup } from '@shared/types'

function state(gap: number): LiveRaceState {
  const s = createEmptyState(2026)
  s.stageNum = 1
  const group: RaceGroup = { id: 'p', name: 'Peloton', order: 0, bibs: [], riders: [], gapToLeaderSeconds: gap }
  s.groups = [group]
  return s
}

describe('GapTrendTracker', () => {
  it('has no trend on the first sample', () => {
    const t = new GapTrendTracker()
    const s = state(120)
    t.apply(s, 0)
    expect(s.groups[0].gapTrend).toBeUndefined()
  })

  it('marks a growing gap as "out" with a positive rate', () => {
    const t = new GapTrendTracker()
    t.apply(state(120), 0)
    const next = state(180)
    t.apply(next, 60_000) // +60s over 1 minute
    expect(next.groups[0].gapTrend).toBe('out')
    expect(next.groups[0].gapTrendSecPerMin).toBe(60)
  })

  it('marks a closing gap as "in" with a negative rate', () => {
    const t = new GapTrendTracker()
    t.apply(state(180), 0)
    const next = state(120)
    t.apply(next, 60_000)
    expect(next.groups[0].gapTrend).toBe('in')
    expect(next.groups[0].gapTrendSecPerMin).toBe(-60)
  })

  it('treats tiny changes as steady', () => {
    const t = new GapTrendTracker()
    t.apply(state(120), 0)
    const next = state(121)
    t.apply(next, 30_000)
    expect(next.groups[0].gapTrend).toBe('steady')
    expect(next.groups[0].gapTrendSecPerMin).toBe(0)
  })

  it('resets history when the stage changes', () => {
    const t = new GapTrendTracker()
    t.apply(state(120), 0)
    const next = state(180)
    next.stageNum = 2
    t.apply(next, 60_000)
    expect(next.groups[0].gapTrend).toBeUndefined()
  })
})
