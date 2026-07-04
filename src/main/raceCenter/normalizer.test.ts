import { describe, expect, it } from 'vitest'
import {
  buildJerseyByBib,
  buildRaceState,
  buildRiderDetail,
  buildTeamDetail,
  buildStageResults,
  computeVirtualGc,
  computeWeather,
  formatClockMs,
  formatGapMs,
  normalizeCommentary,
  normalizeGroups,
  normalizeJerseyHolders,
  normalizeLiveRiders,
  normalizeRankings,
  normalizeRoute,
  normalizeSchedule,
  normalizeStage,
  orderGroups,
  pickLatestCompetitorDoc,
  pickLatestPack,
  computeDayContext,
  stageFromRaw,
  buildRiderIndex
} from './normalizer'
import type { NormalizerInput } from './normalizer'
import type { LiveRider, RaceGroup, RankingSummary } from '@shared/types'

const teams = [{ _id: 't1', code: 'COF', name: 'COFIDIS', color: '#000' }]
const competitors = [
  { _id: 'r1', firstname: 'Tadej', lastname: 'POGACAR', lastnameshort: 'POGACAR', bib: 1, $team: 'team-2025:t1', profile_sm: 'p1.png' },
  { _id: 'r2', firstname: 'Jonas', lastname: 'VINGEGAARD', lastnameshort: 'VINGEGAARD', bib: 2, $team: 'team-2025:t1' },
  { _id: 'r3', firstname: 'No', lastname: 'BIB', lastnameshort: 'BIB', bib: null }
]

function baseInput(over: Partial<NormalizerInput> = {}): NormalizerInput {
  return {
    year: 2025,
    stageNum: 20,
    connection: 'connected',
    teams,
    competitors,
    ...over
  }
}

describe('formatClockMs / formatGapMs', () => {
  it('formats ms clocks', () => {
    expect(formatClockMs(84_000)).toBe('1:24')
    expect(formatClockMs(3_723_000)).toBe('1:02:03')
    expect(formatClockMs(0)).toBeUndefined()
    expect(formatClockMs(undefined)).toBeUndefined()
  })
  it('formats gaps with +', () => {
    expect(formatGapMs(84_000)).toBe('+1:24')
    expect(formatGapMs(0)).toBeUndefined()
  })
})

describe('normalizeStage', () => {
  it('reads city labels, type label, and numeric length display', () => {
    const stage = normalizeStage(
      baseInput({
        stageSingle: [
          {
            stage: 20,
            id: 25316,
            type: 'VAL',
            length: 184.2,
            lengthDisplay: 184.5,
            departureCity: { label: 'Nantua' },
            arrivalCity: { label: 'Pontarlier' },
            isCancelled: false
          }
        ]
      })
    )
    expect(stage?.departureCity).toBe('Nantua')
    expect(stage?.arrivalCity).toBe('Pontarlier')
    expect(stage?.typeLabel).toBe('Hilly')
    expect(stage?.lengthKm).toBe(184.2)
    expect(stage?.lengthDisplay).toBe('184.5 km')
    expect(stage?.id).toBe('25316')
  })

  it('handles string cities', () => {
    const stage = normalizeStage(
      baseInput({ stageSingle: [{ stage: 20, departureCity: 'Paris', arrivalCity: 'Nice' }] })
    )
    expect(stage?.departureCity).toBe('Paris')
  })
})

describe('stageFromRaw time-trial labels', () => {
  it('labels EQU as team time trial', () => {
    const s = stageFromRaw({ stage: 1, type: 'EQU', showGroups: false }, 2026, 1)
    expect(s?.isTimeTrial).toBe(true)
    expect(s?.timeTrialKind).toBe('team')
    expect(s?.typeLabel).toBe('Team time trial')
  })
  it('labels a non-EQU showGroups=false stage as individual time trial', () => {
    const s = stageFromRaw({ stage: 16, type: 'PAS', showGroups: false }, 2026, 16)
    expect(s?.timeTrialKind).toBe('individual')
    expect(s?.typeLabel).toBe('Individual time trial')
  })
  it('keeps normal labels for road stages', () => {
    const s = stageFromRaw({ stage: 5, type: 'PLN', showGroups: true }, 2026, 5)
    expect(s?.isTimeTrial).toBe(false)
    expect(s?.typeLabel).toBe('Flat')
  })
})

describe('computeDayContext', () => {
  const calendar = [
    { stage: 9, type: 'VAL', date: '2026-07-12T00:00:00+02:00', departureCity: 'Malemort', arrivalCity: 'Ussel' },
    { stage: 10, type: 'HMG', date: '2026-07-14T00:00:00+02:00', departureCity: 'Aurillac', arrivalCity: 'Le Lioran' }
  ]

  it('flags a gap day inside the race window as a rest day and points to the next stage', () => {
    const ctx = computeDayContext(calendar, 2026, new Date('2026-07-13T12:00:00+02:00'))
    expect(ctx.isRestDay).toBe(true)
    expect(ctx.raceStarted).toBe(true)
    expect(ctx.raceFinished).toBe(false)
    expect(ctx.nextStage?.stageNum).toBe(10)
  })

  it('is not a rest day on a stage day', () => {
    const ctx = computeDayContext(calendar, 2026, new Date('2026-07-14T09:00:00+02:00'))
    expect(ctx.isRestDay).toBe(false)
    expect(ctx.nextStage?.stageNum).toBe(10)
  })

  it('is not a rest day before the race starts', () => {
    const ctx = computeDayContext(calendar, 2026, new Date('2026-07-01T09:00:00+02:00'))
    expect(ctx.isRestDay).toBe(false)
    expect(ctx.raceStarted).toBe(false)
    expect(ctx.nextStage?.stageNum).toBe(9)
  })

  it('marks the race finished after the last stage', () => {
    const ctx = computeDayContext(calendar, 2026, new Date('2026-08-01T09:00:00+02:00'))
    expect(ctx.raceFinished).toBe(true)
    expect(ctx.isRestDay).toBe(false)
  })
})

describe('buildJerseyByBib', () => {
  it('maps jersey leaders by bib', () => {
    const map = buildJerseyByBib([
      { type: 'pmj', rankings: [{ position: 1, bib: 1 }, { position: 2, bib: 2 }] },
      { type: 'pmp', rankings: [{ position: 1, bib: 2 }] }
    ])
    expect(map.get(1)).toBe('yellow')
    expect(map.get(2)).toBe('green')
  })
})

describe('normalizeGroups', () => {
  it('builds groups, resolves riders, attaches jerseys, orders leader-first', () => {
    const groups = normalizeGroups(
      baseInput({
        rankingJerseys: [{ type: 'pmj', rankings: [{ position: 1, bib: 1 }] }],
        telemetryPack: [
          {
            groups: [
              { name: 'Peloton', bibs: [2], size: 50, completedDistance: 100, relative: 84 },
              { name: 'Breakaway', bibs: [1], size: 1, completedDistance: 110, relative: 0 }
            ]
          }
        ]
      }),
      buildRiderIndex(competitors, teams)
    )
    expect(groups).toHaveLength(2)
    // Breakaway (more completed distance) should be first.
    expect(groups[0].name).toBe('Breakaway')
    expect(groups[0].order).toBe(0)
    const pog = groups[0].riders[0]
    expect(pog.lastName).toBe('POGACAR')
    expect(pog.teamName).toBe('COFIDIS')
    expect(pog.jersey).toBe('yellow')
    expect(groups[0].gapToLeaderSeconds).toBe(0)
    expect(groups[1].gapToLeaderSeconds).toBe(84)
  })

  it('returns [] when telemetry empty', () => {
    expect(normalizeGroups(baseInput({ telemetryPack: [] }), buildRiderIndex())).toEqual([])
    expect(normalizeGroups(baseInput({ telemetryPack: [{ groups: [] }] }), buildRiderIndex())).toEqual([])
  })

  it('creates placeholder riders for unknown bibs', () => {
    const groups = normalizeGroups(
      baseInput({ telemetryPack: [{ groups: [{ name: 'X', bibs: [999] }] }] }),
      buildRiderIndex(competitors, teams)
    )
    expect(groups[0].riders[0].id).toBe('bib-999')
    expect(groups[0].riders[0].bib).toBe(999)
  })
})

describe('orderGroups', () => {
  it('falls back to remaining distance then order', () => {
    const input: RaceGroup[] = [
      { id: 'a', name: 'a', order: 0, bibs: [], riders: [], remainingDistanceKm: 10 },
      { id: 'b', name: 'b', order: 1, bibs: [], riders: [], remainingDistanceKm: 5 }
    ]
    const out = orderGroups(input)
    expect(out[0].id).toBe('b')
  })
})

describe('normalizeCommentary', () => {
  it('filters empties and sorts newest first', () => {
    const msgs = normalizeCommentary(
      baseInput({
        flashInfo: [
          { _id: 'm1', text: 'older', date: 1000 },
          { _id: 'm2', text: '', date: 2000 },
          { _id: 'm3', content: 'newer', date: 3000 }
        ]
      })
    )
    expect(msgs.map((m) => m.text)).toEqual(['newer', 'older'])
  })
})

describe('normalizeRankings', () => {
  it('resolves riders/teams, drops non-classified, formats time/gap', () => {
    const summaries = normalizeRankings(
      baseInput({
        rankingTypes: [
          {
            type: 'etg',
            status: 'official',
            rankings: [
              { position: 1, bib: 1, absolute: 3_723_000, relative: 0, $rider: 'allCompetitors-2025:r1' },
              { position: 2, bib: 2, absolute: 3_807_000, relative: 84_000, $rider: 'allCompetitors-2025:r2' },
              { position: -4, bib: 9 }
            ]
          }
        ]
      }),
      buildRiderIndex(competitors, teams)
    )
    expect(summaries).toHaveLength(1)
    expect(summaries[0].label).toBe('General classification')
    expect(summaries[0].entries).toHaveLength(2)
    expect(summaries[0].entries[0].riderName).toBe('Tadej POGACAR')
    expect(summaries[0].entries[0].timeDisplay).toBe('1:02:03')
    expect(summaries[0].entries[1].gapDisplay).toBe('+1:24')
    expect(summaries[0].entries[0].teamName).toBe('COFIDIS')
  })
})

describe('normalizeRoute', () => {
  it('reads numbered keys in order and climb data', () => {
    const route = normalizeRoute(
      baseInput({
        checkpointDoc: [
          {
            _id: 'doc',
            '1': { checkpoint: 2, latitude: 46.2, longitude: 5.6, checkpointTypes: ['N'] },
            '0': {
              checkpoint: 1,
              latitude: 46.1,
              longitude: 5.5,
              checkpointTypes: ['R'],
              checkpointSummits: [
                { summit: { name: 'Col X', altitude: 1200 }, length: 5000, state: 7.2, code: '2' }
              ]
            }
          }
        ]
      })
    )
    expect(route).toHaveLength(2)
    expect(route[0].latitude).toBe(46.1)
    expect(route[0].summitName).toBe('Col X')
    expect(route[0].summitGradient).toBe(7.2)
    expect(route[1].types).toEqual(['N'])
  })

  it('returns [] without a doc', () => {
    expect(normalizeRoute(baseInput())).toEqual([])
  })

  it('extracts short codes from object-shaped checkpointTypes and uses place names', () => {
    const route = normalizeRoute(
      baseInput({
        checkpointDoc: [
          {
            _id: 'doc',
            '0': {
              checkpoint: 3,
              latitude: 41.4,
              longitude: 2.2,
              place: 'BARCELONE-Fòrum',
              checkpointTypes: [{ type: 'fictive', id: '140794', number: '0', code: 'F' }]
            }
          }
        ]
      })
    )
    expect(route[0].types).toEqual(['F'])
    expect(route[0].name).toBe('BARCELONE-Fòrum')
    expect(route[0].checkpointNumber).toBe(3)
  })
})

describe('buildRiderDetail', () => {
  it('extends the rider with bio fields and resolves the team', () => {
    const detail = buildRiderDetail(
      { _id: 'r1', bib: 1, firstname: 'Tadej', lastname: 'POGACAR', lastnameshort: 'POGAČAR', nationality: 'slo', birthdate: '1998-09-21T00:00:00+02:00', UCICode: '10009108080', victories: 99, podiums: 156, $team: 'team-2025:t1' },
      buildRiderIndex(competitors, teams)
    )
    expect(detail?.lastName).toBe('POGACAR')
    expect(detail?.teamName).toBe('COFIDIS')
    expect(detail?.victories).toBe(99)
    expect(detail?.uciCode).toBe('10009108080')
  })

  it('returns null for unknown rider', () => {
    expect(buildRiderDetail(undefined, buildRiderIndex())).toBeNull()
  })
})

describe('buildTeamDetail', () => {
  it('collects the roster for the team, sorted by bib', () => {
    const detail = buildTeamDetail(teams[0], competitors)
    expect(detail?.name).toBe('COFIDIS')
    // r1(bib1) + r2(bib2) belong to t1; r3 has no $team.
    expect(detail?.riders).toHaveLength(2)
    expect(detail?.riders.map((r) => r.bib)).toEqual([1, 2])
    expect(detail?.id).toBe('t1')
  })

  it('returns null for missing team', () => {
    expect(buildTeamDetail(undefined, competitors)).toBeNull()
  })
})

describe('pickLatestPack', () => {
  it('chooses the freshest pack that has groups', () => {
    const pack = pickLatestPack([
      { date: 1000, groups: [{ name: 'old', bibs: [1] }] },
      { date: 3000, groups: [{ name: 'new', bibs: [2] }] },
      { date: 4000, groups: [] }
    ])
    expect(pack?.groups?.[0].name).toBe('new')
  })
  it('returns undefined when no pack has groups', () => {
    expect(pickLatestPack([{ groups: [] }])).toBeUndefined()
    expect(pickLatestPack([])).toBeUndefined()
  })
})

describe('pickLatestCompetitorDoc', () => {
  it('chooses the newest snapshot with riders', () => {
    const doc = pickLatestCompetitorDoc([
      { TimeStamp: 100, Riders: [{ Bib: 1 }] },
      { TimeStamp: 200, Riders: [{ Bib: 2 }] },
      { TimeStamp: 300, Riders: [] }
    ])
    expect(doc?.TimeStamp).toBe(200)
  })
})

describe('normalizeLiveRiders', () => {
  it('maps telemetry riders, resolves names/teams/jersey and sorts by position', () => {
    const riders = normalizeLiveRiders(
      baseInput({
        telemetryCompetitor: [
          {
            TimeStamp: 10,
            Riders: [
              { Bib: 2, Pos: 2, Latitude: 41.4, Longitude: 2.2, kph: 50, kmToFinish: 5, secToFirstRider: 12 },
              { Bib: 1, Pos: 1, LatLon: [41.5, 2.1], Jersey: 'Y', kph: 52, kmToFinish: 4, secToFirstRider: 0, Status: 'racing' }
            ]
          }
        ]
      }),
      buildRiderIndex(competitors, teams)
    )
    expect(riders).toHaveLength(2)
    expect(riders[0].position).toBe(1)
    expect(riders[0].riderName).toBe('Tadej POGACAR')
    expect(riders[0].jersey).toBe('yellow')
    expect(riders[0].latitude).toBe(41.5)
    expect(riders[0].teamName).toBe('COFIDIS')
    expect(riders[1].bib).toBe(2)
    expect(riders[1].gapToLeaderSeconds).toBe(12)
  })

  it('returns [] without telemetry', () => {
    expect(normalizeLiveRiders(baseInput(), buildRiderIndex())).toEqual([])
  })
})

describe('computeVirtualGc', () => {
  const gc: RankingSummary = {
    type: 'etg',
    label: 'General',
    entries: [
      { position: 1, bib: 1, riderId: 'r1', riderName: 'Leader', absoluteMs: 100_000 },
      { position: 2, bib: 2, riderId: 'r2', riderName: 'Rival', relativeMs: 120_000 }
    ]
  }

  it('returns undefined when the race is together (one group)', () => {
    const groups: RaceGroup[] = [{ id: 'g', name: 'Peloton', order: 0, bibs: [1, 2], riders: [], gapToLeaderSeconds: 0 }]
    expect(computeVirtualGc(groups, [gc])).toBeUndefined()
  })

  it('returns undefined without GC data', () => {
    const groups: RaceGroup[] = [
      { id: 'b', name: 'Break', order: 0, bibs: [2], riders: [], gapToLeaderSeconds: 0 },
      { id: 'p', name: 'Peloton', order: 1, bibs: [1], riders: [], gapToLeaderSeconds: 180 }
    ]
    expect(computeVirtualGc(groups, [])).toBeUndefined()
  })

  it('puts a rival up the road in the virtual lead', () => {
    // Rival is 2:00 down on GC but 3:00 up the road -> virtually leads by 1:00.
    const groups: RaceGroup[] = [
      { id: 'b', name: 'Break', order: 0, bibs: [2], riders: [], size: 1, gapToLeaderSeconds: 0 },
      { id: 'p', name: 'Peloton', order: 1, bibs: [1], riders: [], size: 50, gapToLeaderSeconds: 180 }
    ]
    const v = computeVirtualGc(groups, [gc])
    expect(v?.type).toBe('virtual')
    expect(v?.entries[0].riderId).toBe('r2')
    expect(v?.entries[1].riderId).toBe('r1')
    // r1 virtual gap: (100000 + 180*1000) - (100000+120000 + 0) = 60000ms
    expect(v?.entries[1].relativeMs).toBe(60_000)
  })

  it('keeps the GC leader in front when they are with the break', () => {
    const groups: RaceGroup[] = [
      { id: 'b', name: 'Break', order: 0, bibs: [1], riders: [], size: 5, gapToLeaderSeconds: 0 },
      { id: 'p', name: 'Peloton', order: 1, bibs: [2], riders: [], size: 50, gapToLeaderSeconds: 180 }
    ]
    const v = computeVirtualGc(groups, [gc])
    expect(v?.entries[0].riderId).toBe('r1')
  })
})

describe('computeWeather', () => {
  function rider(over: Partial<LiveRider>): LiveRider {
    return { id: 'r', bib: 1, ...over }
  }

  it('returns undefined without temperature or wind', () => {
    expect(computeWeather([rider({})])).toBeUndefined()
  })

  it('averages temperature and reports no echelon risk without wind', () => {
    const w = computeWeather([rider({ tempC: 26 }), rider({ tempC: 30 })])
    expect(w?.tempC).toBe(28)
    expect(w?.windKmh).toBeUndefined()
    expect(w?.echelonRisk).toBe('none')
  })

  it('flags high echelon risk in a strong crosswind', () => {
    const riders = [
      rider({ windKmh: 30, windRelDeg: 85 }),
      rider({ windKmh: 32, windRelDeg: 80 })
    ]
    const w = computeWeather(riders)
    expect(w?.windType).toBe('cross')
    expect(w?.echelonRisk).toBe('high')
  })

  it('classifies a headwind with no echelon risk', () => {
    const w = computeWeather([rider({ windKmh: 28, windRelDeg: 8 })])
    expect(w?.windType).toBe('head')
    expect(w?.echelonRisk).toBe('none')
  })

  it('classifies a tailwind', () => {
    const w = computeWeather([rider({ windKmh: 20, windRelDeg: 175 })])
    expect(w?.windType).toBe('tail')
  })
})

describe('normalizeJerseyHolders', () => {
  const index = buildRiderIndex(competitors, teams)

  it('resolves the wearer of each jersey from the jersey rankings', () => {
    const input = baseInput({
      rankingJerseys: [
        { _id: 'j1', type: 'pmj', rankings: [{ position: 1, bib: 1 }] },
        { _id: 'j2', type: 'pmp', rankings: [{ position: 1, bib: 2 }] }
      ]
    })
    const holders = normalizeJerseyHolders(input, index)
    expect(holders).toHaveLength(2)
    expect(holders[0]).toMatchObject({ jersey: 'yellow', riderName: 'Tadej POGACAR' })
    expect(holders[1]).toMatchObject({ jersey: 'green', riderName: 'Jonas VINGEGAARD' })
  })

  it('returns [] without jersey rankings', () => {
    expect(normalizeJerseyHolders(baseInput(), index)).toEqual([])
  })
})

describe('buildRaceState', () => {
  it('produces a complete state and never throws on sparse input', () => {
    const state = buildRaceState(baseInput({ connection: 'loading' }))
    expect(state.connection).toBe('loading')
    expect(state.year).toBe(2025)
    expect(state.groups).toEqual([])
    expect(state.commentary).toEqual([])
    expect(state.isLive).toBe(false)
  })

  it('marks live when telemetry has groups', () => {
    const state = buildRaceState(
      baseInput({ telemetryPack: [{ groups: [{ name: 'Peloton', bibs: [1] }] }] })
    )
    expect(state.isLive).toBe(true)
    expect(state.groups).toHaveLength(1)
  })

  it('marks live and fills liveRiders from per-rider telemetry (time trial)', () => {
    const state = buildRaceState(
      baseInput({
        stageSingle: [{ stage: 1, type: 'EQU', showGroups: false }],
        telemetryCompetitor: [{ TimeStamp: 5, RaceStatus: true, Riders: [{ Bib: 1, Pos: 1 }] }]
      })
    )
    expect(state.isLive).toBe(true)
    expect(state.raceStatus).toBe(true)
    expect(state.stage?.showGroups).toBe(false)
    expect(state.liveRiders).toHaveLength(1)
  })
})

describe('normalizeSchedule', () => {
  it('returns stages sorted by number', () => {
    const schedule = normalizeSchedule(
      baseInput({
        stages: [
          { stage: 3, type: 'PLA', departureCity: 'C', arrivalCity: 'D' },
          { stage: 1, type: 'PLA', departureCity: 'A', arrivalCity: 'B' },
          { stage: 2, type: 'MON', departureCity: 'B', arrivalCity: 'C' }
        ]
      })
    )
    expect(schedule.map((s) => s.stageNum)).toEqual([1, 2, 3])
    expect(schedule[0].departureCity).toBe('A')
  })

  it('returns [] without a stage list', () => {
    expect(normalizeSchedule(baseInput())).toEqual([])
  })
})

describe('buildStageResults', () => {
  const index = buildRiderIndex(competitors, teams)

  it('extracts stage result (ete) and GC (etg)', () => {
    const results = buildStageResults(
      baseInput({
        stageNum: 5,
        stageSingle: [{ stage: 5, type: 'PLA', departureCity: 'A', arrivalCity: 'B' }],
        rankingTypes: [
          { _id: 'e', type: 'ete', rankings: [{ position: 1, bib: 1, absolute: 1000, relative: 0 }] },
          { _id: 'g', type: 'etg', rankings: [{ position: 1, bib: 2, absolute: 2000, relative: 0 }] }
        ]
      }),
      index
    )
    expect(results.hasData).toBe(true)
    expect(results.stageNum).toBe(5)
    expect(results.stageResult?.type).toBe('ete')
    expect(results.gc?.type).toBe('etg')
    expect(results.stage?.departureCity).toBe('A')
  })

  it('reports no data when rankings are absent', () => {
    const results = buildStageResults(baseInput({ stageNum: 5 }), index)
    expect(results.hasData).toBe(false)
    expect(results.stageResult).toBeUndefined()
  })
})
