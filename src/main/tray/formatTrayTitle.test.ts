import { describe, expect, it } from 'vitest'
import {
  findLeadGroup,
  findPeloton,
  formatDistance,
  formatSeconds,
  formatTrayTitle
} from './formatTrayTitle'
import { createEmptyState } from '@shared/types'
import type { LiveRaceState, RaceGroup } from '@shared/types'

function group(over: Partial<RaceGroup>): RaceGroup {
  return { id: over.id ?? 'g', name: over.name ?? 'g', order: 0, bibs: [], riders: [], ...over }
}

function state(over: Partial<LiveRaceState>): LiveRaceState {
  return { ...createEmptyState(2026), connection: 'connected', ...over }
}

describe('formatSeconds', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatSeconds(84)).toBe('1:24')
    expect(formatSeconds(3723)).toBe('1:02:03')
    expect(formatSeconds(0)).toBe('0:00')
    expect(formatSeconds(undefined)).toBe('')
  })
})

describe('formatDistance', () => {
  it('rounds >=10km, keeps decimal below', () => {
    expect(formatDistance(47.3)).toBe('47km')
    expect(formatDistance(3.45)).toBe('3.5km')
    expect(formatDistance(undefined)).toBe('')
  })
})

describe('findPeloton / findLeadGroup', () => {
  const groups = [
    group({ id: 'break', name: 'Breakaway', order: 0, size: 3, completedDistanceKm: 110 }),
    group({ id: 'pel', name: 'Peloton', order: 1, size: 120, completedDistanceKm: 100 })
  ]
  it('finds peloton by name', () => {
    expect(findPeloton(groups)?.id).toBe('pel')
  })
  it('finds lead group by completed distance', () => {
    expect(findLeadGroup(groups)?.id).toBe('break')
  })
  it('falls back to largest group when unnamed', () => {
    const g = [group({ id: 'a', name: 'G1', size: 2 }), group({ id: 'b', name: 'G2', size: 60 })]
    expect(findPeloton(g)?.id).toBe('b')
  })
})

describe('formatTrayTitle', () => {
  it('returns TdF with no live data', () => {
    expect(formatTrayTitle(state({ groups: [] }))).toBe('TdF')
  })

  it('appends … when reconnecting', () => {
    expect(formatTrayTitle(state({ groups: [], connection: 'reconnecting' }))).toBe('TdF …')
  })

  it('shows breakaway gap to peloton', () => {
    const s = state({
      groups: [
        group({ id: 'break', name: 'Breakaway', order: 0, completedDistanceKm: 110, gapToLeaderSeconds: 0 }),
        group({ id: 'pel', name: 'Peloton', order: 1, size: 120, completedDistanceKm: 100, gapToLeaderSeconds: 84 })
      ]
    })
    expect(formatTrayTitle(s)).toBe('B +1:24')
  })

  it('uses B1 when multiple groups lead the peloton', () => {
    const s = state({
      groups: [
        group({ id: 'b1', name: 'Leaders', order: 0, completedDistanceKm: 120, gapToLeaderSeconds: 0 }),
        group({ id: 'b2', name: 'Chase', order: 1, completedDistanceKm: 115, gapToLeaderSeconds: 30 }),
        group({ id: 'pel', name: 'Peloton', order: 2, size: 100, completedDistanceKm: 100, gapToLeaderSeconds: 90 })
      ]
    })
    expect(formatTrayTitle(s)).toBe('B1 +1:30')
  })

  it('shows remaining distance when all together', () => {
    const s = state({
      groups: [group({ id: 'pel', name: 'Peloton', order: 0, size: 150, remainingDistanceKm: 47 })]
    })
    expect(formatTrayTitle(s)).toBe('47km')
  })

  it('falls back to Live when no gap and no distance', () => {
    const s = state({
      groups: [group({ id: 'pel', name: 'Peloton', order: 0, size: 150 })]
    })
    expect(formatTrayTitle(s)).toBe('Live')
  })

  it('shows flamme rouge in the final kilometre', () => {
    const s = state({
      groups: [group({ id: 'pel', name: 'Peloton', order: 0, size: 150, remainingDistanceKm: 0.85 })]
    })
    expect(formatTrayTitle(s)).toBe('FR 850m')
  })

  it('shows gap trend when the peloton is closing', () => {
    const s = state({
      groups: [
        group({ id: 'break', name: 'Breakaway', order: 0, completedDistanceKm: 110, gapToLeaderSeconds: 0 }),
        group({
          id: 'pel',
          name: 'Peloton',
          order: 1,
          size: 120,
          completedDistanceKm: 100,
          gapToLeaderSeconds: 84,
          gapTrend: 'in'
        })
      ]
    })
    expect(formatTrayTitle(s)).toBe('B ▼ +1:24')
  })

  it('shows gap trend when the break is extending', () => {
    const s = state({
      groups: [
        group({ id: 'break', name: 'Breakaway', order: 0, completedDistanceKm: 110, gapToLeaderSeconds: 0 }),
        group({
          id: 'pel',
          name: 'Peloton',
          order: 1,
          size: 120,
          completedDistanceKm: 100,
          gapToLeaderSeconds: 84,
          gapTrend: 'out'
        })
      ]
    })
    expect(formatTrayTitle(s)).toBe('B ▲ +1:24')
  })
})
