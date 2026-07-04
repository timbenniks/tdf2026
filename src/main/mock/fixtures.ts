import type {
  RawCheckpointDoc,
  RawCompetitor,
  RawFlashInfo,
  RawMillesime,
  RawRankingType,
  RawStage,
  RawTeam,
  RawTelemetryCompetitorDoc,
  RawTelemetryPack
} from '../raceCenter/types'

// Lightweight, fabricated fixtures so the app is fully developable off-season.
// Not real results — just plausible shapes for the normalizer + UI.

export const MOCK_YEAR = 2025
export const MOCK_STAGE = 12

export const mockMillesime: RawMillesime[] = [
  { _id: 'm2025', year: 2025, isLive: true, timezone: 'Europe/Paris', maxAltitude: 2304 }
]

export const mockTeams: RawTeam[] = [
  { _id: 'tUAD', code: 'UAD', name: 'UAE Team Emirates', color: '#d6001c', nationality: 'UAE' },
  { _id: 'tTVL', code: 'TVL', name: 'Team Visma | Lease a Bike', color: '#fbe500', nationality: 'NED' },
  { _id: 'tSOQ', code: 'SOQ', name: 'Soudal Quick-Step', color: '#0a1c4b', nationality: 'BEL' },
  { _id: 'tEFE', code: 'EFE', name: 'EF Education-EasyPost', color: '#ff0098', nationality: 'USA' }
]

export const mockCompetitors: RawCompetitor[] = [
  { _id: 'r1', bib: 1, firstname: 'Tadej', lastname: 'POGACAR', lastnameshort: 'POGAČAR', nationality: 'slo', birthdate: '1998-09-21T00:00:00+02:00', UCICode: '10009108080', victories: 99, podiums: 156, $team: 'team-2025:tUAD' },
  { _id: 'r2', bib: 2, firstname: 'Adam', lastname: 'YATES', lastnameshort: 'YATES', nationality: 'gbr', birthdate: '1992-08-07T00:00:00+02:00', UCICode: '10006896697', victories: 21, podiums: 48, $team: 'team-2025:tUAD' },
  { _id: 'r11', bib: 11, firstname: 'Jonas', lastname: 'VINGEGAARD', lastnameshort: 'VINGEGAARD', nationality: 'den', birthdate: '1996-12-10T00:00:00+01:00', UCICode: '10009502438', victories: 32, podiums: 60, $team: 'team-2025:tTVL' },
  { _id: 'r12', bib: 12, firstname: 'Wout', lastname: 'VAN AERT', lastnameshort: 'VAN AERT', nationality: 'bel', birthdate: '1994-09-15T00:00:00+02:00', UCICode: '10008915476', victories: 47, podiums: 110, $team: 'team-2025:tTVL' },
  { _id: 'r21', bib: 21, firstname: 'Remco', lastname: 'EVENEPOEL', lastnameshort: 'EVENEPOEL', nationality: 'bel', birthdate: '2000-01-25T00:00:00+01:00', UCICode: '10010829460', victories: 53, podiums: 79, $team: 'team-2025:tSOQ' },
  { _id: 'r31', bib: 31, firstname: 'Richard', lastname: 'CARAPAZ', lastnameshort: 'CARAPAZ', nationality: 'ecu', birthdate: '1993-05-29T00:00:00+02:00', UCICode: '10007518438', victories: 18, podiums: 37, $team: 'team-2025:tEFE' },
  { _id: 'r41', bib: 41, firstname: 'Ben', lastname: 'HEALY', lastnameshort: 'HEALY', nationality: 'irl', birthdate: '2000-09-11T00:00:00+02:00', UCICode: '10015096780', victories: 7, podiums: 14, $team: 'team-2025:tEFE' },
  { _id: 'r42', bib: 42, firstname: 'Neilson', lastname: 'POWLESS', lastnameshort: 'POWLESS', nationality: 'usa', birthdate: '1996-09-03T00:00:00+02:00', UCICode: '10009041095', victories: 5, podiums: 16, $team: 'team-2025:tEFE' }
]

export const mockStage: RawStage[] = [
  {
    _id: 's12',
    stage: MOCK_STAGE,
    id: 25312,
    date: '2025-07-17T00:00:00+02:00',
    type: 'HMG',
    length: 180.6,
    lengthDisplay: 180.6,
    departureCity: { label: 'Bourg-en-Bresse' },
    arrivalCity: { label: 'Le Grand-Bornand' },
    startTime: '12:30:00',
    endTime: '17:05:00',
    timezone: 'Europe/Paris',
    showGroups: true,
    isCancelled: false
  }
]

/** Two-stage calendar straddling a rest day (2026-07-13), used by the rest-day mock. */
export const mockRestCalendar: RawStage[] = [
  {
    _id: 's9',
    stage: 9,
    type: 'VAL',
    date: '2026-07-12T00:00:00+02:00',
    length: 184,
    departureCity: { label: 'Malemort' },
    arrivalCity: { label: 'Ussel' },
    startTime: '13:45:00',
    showGroups: true
  },
  {
    _id: 's10',
    stage: 10,
    type: 'HMG',
    date: '2026-07-14T00:00:00+02:00',
    length: 165.3,
    departureCity: { label: 'Aurillac' },
    arrivalCity: { label: 'Le Lioran' },
    startTime: '13:25:00',
    showGroups: true
  }
]

export const MOCK_REST_NOW = new Date('2026-07-13T12:00:00+02:00')

// --- scripted event sequence (for verifying notifications) ---------------

function gcRanking(leaderBib: number): RawRankingType {
  const order = leaderBib === 1 ? [1, 11, 21, 31] : [11, 1, 21, 31]
  return {
    _id: 'r-etg',
    type: 'etg',
    status: 'official',
    rankings: order.map((bib, i) => ({
      position: i + 1,
      bib,
      absolute: 165_900_000 + i * 144_000,
      relative: i * 144_000,
      $rider: `allCompetitors-2025:r${bib}`
    }))
  }
}

const pelotonOnly: RawTelemetryPack[] = [
  {
    _id: 'tp-1',
    date: 1,
    groups: [{ name: 'Peloton', bibs: [1, 2, 11, 12, 21], size: 150, completedDistance: 100, relative: 0 }]
  }
]

const twoGroups: RawTelemetryPack[] = [
  {
    _id: 'tp-2',
    date: 2,
    groups: [
      { name: 'Breakaway', bibs: [41, 42], size: 2, completedDistance: 120, relative: 0 },
      { name: 'Peloton', bibs: [1, 2, 11, 12, 21], size: 148, completedDistance: 100, relative: 130 }
    ]
  }
]

const stageResult: RawRankingType = {
  _id: 'r-ete',
  type: 'ete',
  status: 'official',
  rankings: [{ position: 1, bib: 12, $rider: 'allCompetitors-2025:r12' }]
}

/**
 * Six-step loop exercising every notification: pre-race → start → breakaway →
 * jersey change → caught → finish. Returned as the live bits of a NormalizerInput.
 */
export function buildMockEventStep(tick: number): {
  telemetryPack: RawTelemetryPack[]
  rankingTypes: RawRankingType[]
} {
  switch (tick % 6) {
    case 1: // stage start
      return { telemetryPack: pelotonOnly, rankingTypes: [gcRanking(1)] }
    case 2: // breakaway clear
      return { telemetryPack: twoGroups, rankingTypes: [gcRanking(1)] }
    case 3: // new yellow jersey
      return { telemetryPack: twoGroups, rankingTypes: [gcRanking(11)] }
    case 4: // caught
      return { telemetryPack: pelotonOnly, rankingTypes: [gcRanking(11)] }
    case 5: // finish
      return { telemetryPack: [], rankingTypes: [gcRanking(11), stageResult] }
    default: // 0 — pre-race baseline
      return { telemetryPack: [], rankingTypes: [gcRanking(1)] }
  }
}

export const MOCK_TT_STAGE = 1

export const mockStageTT: RawStage[] = [
  {
    _id: 's1tt',
    stage: MOCK_TT_STAGE,
    id: 25301,
    date: '2026-07-04T00:00:00+02:00',
    type: 'EQU',
    length: 19.6,
    lengthDisplay: 19.6,
    departureCity: { label: 'Barcelona' },
    arrivalCity: { label: 'Barcelona' },
    startTime: '17:05:00',
    endTime: '19:16:00',
    showGroups: false,
    timezone: 'Europe/Paris',
    isCancelled: false
  }
]

// A short loop around Barcelona (start, chrono points, finish) for the TT mock.
const TT_ROUTE: [number, number][] = [
  [41.4061, 2.2201],
  [41.4035, 2.196],
  [41.3905, 2.171],
  [41.3705, 2.153],
  [41.3645, 2.158]
]

function interpolateRoute(frac: number): [number, number] {
  const clamped = Math.max(0, Math.min(1, frac))
  const seg = clamped * (TT_ROUTE.length - 1)
  const i = Math.min(TT_ROUTE.length - 2, Math.floor(seg))
  const t = seg - i
  const [aLat, aLon] = TT_ROUTE[i]
  const [bLat, bLon] = TT_ROUTE[i + 1]
  return [aLat + (bLat - aLat) * t, aLon + (bLon - aLon) * t]
}

const TT_JERSEYS: Record<number, string> = { 1: 'Y', 12: 'G', 41: 'P', 21: 'W' }

/** A telemetryCompetitor snapshot: each rider on course with their own position/gap. */
export function buildMockCompetitor(tick: number): RawTelemetryCompetitorDoc[] {
  const total = 19.6
  const riders = mockCompetitors.map((c, idx) => {
    // Stagger riders along the course; leaders are further along.
    const progress = Math.max(0, Math.min(1, 0.06 * tick - idx * 0.05))
    const [lat, lon] = interpolateRoute(progress)
    const kmToFinish = +(total * (1 - progress)).toFixed(1)
    return {
      Bib: c.bib ?? 0,
      Latitude: lat,
      Longitude: lon,
      LatLon: [lat, lon] as [number, number],
      Jersey: c.bib != null ? (TT_JERSEYS[c.bib] ?? null) : null,
      kph: +(48 + Math.sin(tick + idx) * 4).toFixed(1),
      kphAvg: 47.5,
      Gradient: 1,
      kmToFinish,
      secToFirstRider: idx === 0 ? 0 : idx * 7 + (tick % 3),
      Pos: idx + 1,
      Status: kmToFinish <= 0 ? 'finished' : 'racing',
      // Hot day with a strong side wind — crosswind/echelon demo conditions.
      degC: +(28 + Math.sin(idx) * 1.5).toFixed(0),
      kphWind: +(30 + Math.sin(tick * 0.3 + idx) * 6).toFixed(0),
      RiderWindDir: +(78 + Math.cos(idx) * 8).toFixed(0)
    }
  })
  return [
    {
      _id: 'tc-snap',
      RaceStatus: true,
      RaceName: 'TDF 2026 (mock)',
      StageId: '25301',
      TimeStamp: Math.floor(Date.now() / 1000),
      Riders: riders
    }
  ]
}

export const mockJerseys: RawRankingType[] = [
  { _id: 'j-pmj', type: 'pmj', rankings: [{ position: 1, bib: 1 }] },
  { _id: 'j-pmp', type: 'pmp', rankings: [{ position: 1, bib: 12 }] },
  { _id: 'j-pmm', type: 'pmm', rankings: [{ position: 1, bib: 41 }] },
  { _id: 'j-pmt', type: 'pmt', rankings: [{ position: 1, bib: 21 }] }
]

export const mockRankings: RawRankingType[] = [
  {
    _id: 'rk-etg',
    type: 'etg',
    status: 'live',
    rankings: [
      { position: 1, bib: 1, absolute: 165_900_000, relative: 0, $rider: 'allCompetitors-2025:r1' },
      { position: 2, bib: 11, absolute: 166_044_000, relative: 144_000, $rider: 'allCompetitors-2025:r11' },
      { position: 3, bib: 21, absolute: 166_182_000, relative: 282_000, $rider: 'allCompetitors-2025:r21' },
      { position: 4, bib: 31, absolute: 166_500_000, relative: 600_000, $rider: 'allCompetitors-2025:r31' }
    ]
  },
  {
    _id: 'rk-ete',
    type: 'ete',
    status: 'official',
    rankings: [
      { position: 1, bib: 12, absolute: 14_880_000, relative: 0, $rider: 'allCompetitors-2025:r12' },
      { position: 2, bib: 1, absolute: 14_880_000, relative: 0, $rider: 'allCompetitors-2025:r1' },
      { position: 3, bib: 21, absolute: 14_884_000, relative: 4_000, $rider: 'allCompetitors-2025:r21' },
      { position: 4, bib: 11, absolute: 14_896_000, relative: 16_000, $rider: 'allCompetitors-2025:r11' }
    ]
  }
]

export const mockCheckpoint: RawCheckpointDoc[] = [
  {
    _id: 'cp12',
    '0': { checkpoint: 1, latitude: 46.205, longitude: 5.225, checkpointTypes: ['R'], length: 0 },
    '1': { checkpoint: 2, latitude: 46.1, longitude: 5.7, checkpointTypes: ['C'], length: 48 },
    '2': { checkpoint: 3, latitude: 46.05, longitude: 6.0, checkpointTypes: ['N'], length: 60 },
    '3': {
      checkpoint: 4,
      latitude: 46.0,
      longitude: 6.2,
      checkpointTypes: [],
      length: 95,
      checkpointSummits: [
        { summit: { name: 'Col des Aravis', altitude: 1486 }, length: 6.7, state: 7.2, code: '2' }
      ]
    },
    '4': {
      checkpoint: 5,
      latitude: 45.95,
      longitude: 6.35,
      checkpointTypes: [],
      length: 130,
      checkpointSummits: [
        { summit: { name: 'Col de la Colombière', altitude: 1618 }, length: 11.7, state: 5.8, code: '1' }
      ]
    },
    '5': { checkpoint: 6, latitude: 45.94, longitude: 6.43, checkpointTypes: ['A'], length: 180.6 }
  }
]

const flashTexts = [
  'Le peloton roule à vive allure en vallée avant la première difficulté du jour.',
  'Échappée de 3 coureurs avec un avantage qui se stabilise autour de 2 minutes.',
  'Crash évité dans le peloton, tout le monde est resté debout.',
  'Pogačar bien placé en tête de peloton avec ses équipiers UAE.',
  'La Visma lance les hostilités au pied du col, le rythme grimpe.',
  'Healy passe en tête au sommet et engrange des points pour le maillot à pois.'
]

export function buildMockFlash(count: number, baseTime: number): RawFlashInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    _id: `flash-${i}`,
    date: baseTime - i * 90_000,
    text: flashTexts[i % flashTexts.length]
  }))
}

/** A telemetry pack with three groups whose gaps shrink over `tick`. */
export function buildMockTelemetry(tick: number): RawTelemetryPack[] {
  const breakawayGap = Math.max(0, 150 - tick * 6)
  const chaseGap = Math.max(0, 95 - tick * 4)
  const remaining = Math.max(0, 62 - tick * 1.4)
  const completed = 180.6 - remaining

  return [
    {
      _id: 'pack12',
      date: Date.now(),
      type: 'live',
      groups: [
        {
          name: 'Breakaway',
          bibs: [41, 42, 31],
          latitude: 45.97,
          longitude: 6.3,
          size: 3,
          speed: 34.5,
          relative: 0,
          secGapToPrev: 0,
          computedRemainingDistance: remaining,
          completedDistance: completed,
          hasPolkaDotJersey: true,
          localization: 'Montée du Col de la Colombière'
        },
        {
          name: 'Chase',
          bibs: [12, 21],
          latitude: 45.99,
          longitude: 6.26,
          size: 2,
          speed: 33.1,
          relative: breakawayGap - chaseGap,
          secGapToPrev: breakawayGap - chaseGap,
          computedRemainingDistance: remaining + (breakawayGap - chaseGap) / 60,
          completedDistance: completed - (breakawayGap - chaseGap) / 60,
          hasGreenJersey: true,
          hasWhiteJersey: true,
          localization: 'Vallée'
        },
        {
          name: 'Peloton',
          bibs: [1, 2, 11],
          latitude: 46.01,
          longitude: 6.2,
          size: 64,
          speed: 32.4,
          relative: breakawayGap,
          secGapToPrev: chaseGap,
          computedRemainingDistance: remaining + breakawayGap / 60,
          completedDistance: completed - breakawayGap / 60,
          hasYellowJersey: true,
          localization: 'Vallée avant le col'
        }
      ]
    }
  ]
}
