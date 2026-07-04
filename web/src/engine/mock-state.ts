import { DEFAULT_STAGE, DEFAULT_YEAR } from '@shared/config'
import type { LiveRaceState } from '@shared/types'

/** Phase 1 mock snapshot — replaced by RaceProvider in Phase 2. */
export function getMockState(): LiveRaceState {
  return {
    connection: 'connected',
    year: DEFAULT_YEAR,
    stageNum: DEFAULT_STAGE,
    mock: true,
    isLive: true,
    raceStatus: true,
    stage: {
      year: DEFAULT_YEAR,
      stageNum: DEFAULT_STAGE,
      type: 'PLN',
      typeLabel: 'Flat',
      departureCity: 'Lille',
      arrivalCity: 'Lille',
      lengthKm: 185,
      date: '2026-07-04',
      showGroups: true
    },
    groups: [
      {
        id: 'lead',
        name: 'Lead Group',
        order: 0,
        size: 4,
        bibs: [101, 42, 88, 7],
        riders: [],
        gapToLeaderSeconds: 0,
        completedDistanceKm: 142,
        remainingDistanceKm: 43,
        speedKmh: 48.2
      },
      {
        id: 'peloton',
        name: 'Peloton',
        order: 1,
        size: 148,
        bibs: [],
        riders: [],
        gapToLeaderSeconds: 95,
        completedDistanceKm: 138,
        remainingDistanceKm: 47,
        gapTrend: 'in',
        gapTrendSecPerMin: -12
      }
    ],
    liveRiders: [],
    commentary: [
      {
        id: 'c1',
        text: 'The break is holding a steady advantage as we approach the final hour.',
        timestamp: new Date().toISOString()
      }
    ],
    rankings: [],
    jerseyHolders: [],
    schedule: [],
    route: [],
    lastUpdated: new Date().toISOString()
  }
}
