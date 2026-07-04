import { describe, expect, it } from 'vitest'
import { createEmptyState, type LiveRaceState, type RaceGroup, type RankingSummary } from '@shared/types'
import { detectRaceEvents, isRacing, jerseyHolders } from './raceEvents'

function state(over: Partial<LiveRaceState> = {}): LiveRaceState {
  return {
    ...createEmptyState(2026),
    stageNum: 5,
    stage: { year: 2026, stageNum: 5, departureCity: 'Pau', arrivalCity: 'Bordeaux', showGroups: true },
    ...over
  }
}

function group(name: string, over: Partial<RaceGroup> = {}): RaceGroup {
  return { id: name, name, order: 0, bibs: [], riders: [], ...over }
}

function gcSummary(bib: number, name: string): RankingSummary {
  return { type: 'etg', label: 'GC', entries: [{ position: 1, bib, riderName: name }] }
}

describe('isRacing', () => {
  it('is true with telemetry, false otherwise', () => {
    expect(isRacing(state())).toBe(false)
    expect(isRacing(state({ groups: [group('Break')] }))).toBe(true)
    expect(isRacing(state({ raceStatus: true }))).toBe(true)
    expect(isRacing(state({ liveRiders: [{ id: 'r', bib: 1 }] }))).toBe(true)
  })
})

describe('detectRaceEvents', () => {
  it('fires a stage-start when telemetry begins', () => {
    const events = detectRaceEvents(state(), state({ raceStatus: true }))
    expect(events.map((e) => e.type)).toContain('stageStart')
    expect(events[0].body).toContain('Pau')
  })

  it('fires a stage-finish with the winner when racing stops', () => {
    const prev = state({ groups: [group('Peloton', { size: 100 })] })
    const next = state({
      rankings: [{ type: 'ete', label: 'Stage', entries: [{ position: 1, riderName: 'M. Cavendish' }] }]
    })
    const events = detectRaceEvents(prev, next)
    const finish = events.find((e) => e.type === 'stageFinish')
    expect(finish?.body).toBe('Winner: M. Cavendish')
  })

  it('fires breakaway when groups split and caught when they merge', () => {
    const one = state({ groups: [group('Peloton', { size: 150 })] })
    const two = state({
      groups: [
        group('Breakaway', { size: 4, order: 0 }),
        group('Peloton', { size: 146, order: 1, gapToLeaderSeconds: 125 })
      ]
    })
    const formed = detectRaceEvents(one, two).find((e) => e.type === 'breakaway')
    expect(formed?.body).toContain('Breakaway')
    expect(formed?.body).toContain('2:05')

    const caught = detectRaceEvents(two, one).find((e) => e.type === 'caught')
    expect(caught).toBeTruthy()
  })

  it('does not fire group events for time trials', () => {
    const tt = { year: 2026, stageNum: 1, showGroups: false }
    const one = state({ stage: tt, groups: [group('A')] })
    const two = state({ stage: tt, groups: [group('A'), group('B')] })
    expect(detectRaceEvents(one, two).some((e) => e.type === 'breakaway')).toBe(false)
  })

  it('fires a jersey change when the GC leader changes', () => {
    const prev = state({ raceStatus: true, rankings: [gcSummary(1, 'Pogačar')] })
    const next = state({ raceStatus: true, rankings: [gcSummary(2, 'Vingegaard')] })
    const jersey = detectRaceEvents(prev, next).find((e) => e.type === 'jersey')
    expect(jersey?.title).toBe('Yellow jersey')
    expect(jersey?.body).toBe('Now led by Vingegaard')
  })

  it('does not fire a jersey change when the leader is unchanged', () => {
    const prev = state({ raceStatus: true, rankings: [gcSummary(1, 'Pogačar')] })
    const next = state({ raceStatus: true, rankings: [gcSummary(1, 'Pogačar')] })
    expect(detectRaceEvents(prev, next).some((e) => e.type === 'jersey')).toBe(false)
  })
})

describe('jerseyHolders', () => {
  it('extracts position-1 leaders per classification', () => {
    const holders = jerseyHolders(
      state({
        rankings: [
          { type: 'etg', label: 'GC', entries: [{ position: 1, bib: 1, riderName: 'A' }] },
          { type: 'img', label: 'KOM', entries: [{ position: 2, bib: 9 }, { position: 1, bib: 7, riderName: 'B' }] }
        ]
      })
    )
    expect(holders.get('etg')?.name).toBe('A')
    expect(holders.get('img')?.name).toBe('B')
  })
})
