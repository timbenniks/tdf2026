// Normalized, UI-facing types. The renderer only ever sees these — never raw
// Race Center payloads.

export type RaceConnectionState =
  | 'idle'
  | 'loading'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'error'

export type StageInfo = {
  year: number
  stageNum: number
  id?: string
  date?: string
  type?: string
  typeLabel?: string
  departureCity?: string
  arrivalCity?: string
  lengthKm?: number
  lengthDisplay?: string
  startTime?: string
  endTime?: string
  timezone?: string
  isCancelled?: boolean
  /** False for time trials (EQU/ITT) — the group view doesn't apply. */
  showGroups?: boolean
  /** True when the stage is a time trial (team or individual). */
  isTimeTrial?: boolean
  timeTrialKind?: 'team' | 'individual'
}

export type Rider = {
  id: string
  bib?: number
  firstName?: string
  lastName?: string
  shortName?: string
  nationality?: string
  teamId?: string
  teamCode?: string
  teamName?: string
  teamColor?: string
  profileImage?: string
  jersey?: string
}

export type RaceGroup = {
  id: string
  name: string
  order: number
  size?: number
  riders: Rider[]
  bibs: number[]
  latitude?: number
  longitude?: number
  speedKmh?: number
  gapToLeaderSeconds?: number
  gapToPreviousSeconds?: number
  remainingDistanceKm?: number
  completedDistanceKm?: number
  /** Direction the gap to the leader is moving: 'in' = closing, 'out' = growing. */
  gapTrend?: 'in' | 'out' | 'steady'
  /** Rate of change of the gap, signed seconds per minute (+ growing, − closing). */
  gapTrendSecPerMin?: number
  hasYellowJersey?: boolean
  hasGreenJersey?: boolean
  hasPolkaDotJersey?: boolean
  hasWhiteJersey?: boolean
  localization?: string
}

export type LiveMessage = {
  id: string
  timestamp?: string
  text: string
  title?: string
}

/** Per-rider live GPS/telemetry (from telemetryCompetitor). Works for time trials. */
export type LiveRider = {
  id: string
  bib: number
  riderName?: string
  shortName?: string
  teamName?: string
  teamColor?: string
  jersey?: string
  latitude?: number
  longitude?: number
  speedKmh?: number
  avgSpeedKmh?: number
  gradient?: number
  kmToFinish?: number
  gapToLeaderSeconds?: number
  position?: number
  status?: string
  /** Air temperature at the rider (°C). */
  tempC?: number
  /** Wind speed at the rider (km/h). */
  windKmh?: number
  /** Wind angle relative to travel: 0 = headwind, 180 = tailwind, 90/270 = crosswind. */
  windRelDeg?: number
}

/** Aggregate live conditions across the field, with crosswind/echelon assessment. */
export type RaceWeather = {
  tempC?: number
  windKmh?: number
  /** Mean wind angle relative to travel (0 = head, 180 = tail). */
  windRelDeg?: number
  windType?: 'head' | 'tail' | 'cross'
  /** Crosswind echelon risk derived from wind speed × sideways component. */
  echelonRisk: 'none' | 'low' | 'moderate' | 'high'
  sampleCount: number
}

/** Current wearer of a leader jersey. */
export type JerseyHolder = {
  jersey: 'yellow' | 'green' | 'polkaDot' | 'white'
  riderId?: string
  riderName?: string
  teamName?: string
  teamColor?: string
}

export type RankingEntry = {
  position: number
  bib?: number
  riderId?: string
  riderName?: string
  teamId?: string
  teamName?: string
  teamColor?: string
  absoluteMs?: number
  relativeMs?: number
  timeDisplay?: string
  gapDisplay?: string
}

export type RankingSummary = {
  type: string
  label: string
  status?: string
  checkpoint?: number
  entries: RankingEntry[]
}

export type RoutePoint = {
  index: number
  checkpointNumber?: number
  name?: string
  latitude: number
  longitude: number
  lengthKm?: number
  /** Short type codes (F/R/N/C/A). */
  types: string[]
  summitName?: string
  summitAltitude?: number
  summitCategory?: string
  summitGradient?: number
}

/** Results for a single (possibly past) stage, fetched on demand. */
export type StageResults = {
  year: number
  stageNum: number
  stage?: StageInfo
  /** Stage finishing order (classification 'ete'). */
  stageResult?: RankingSummary
  /** General classification after the stage (classification 'etg'). */
  gc?: RankingSummary
  hasData: boolean
}

export type RiderDetail = Rider & {
  birthdate?: string
  uciCode?: string
  victories?: number
  podiums?: number
  profileImageLarge?: string
}

export type TeamDetail = {
  id: string
  code?: string
  name?: string
  nameShort?: string
  nationality?: string
  color?: string
  jerseyImage?: string
  logo?: string
  riders: Rider[]
}

export type LiveRaceState = {
  connection: RaceConnectionState
  year: number
  stageNum?: number
  stage?: StageInfo
  groups: RaceGroup[]
  liveRiders: LiveRider[]
  commentary: LiveMessage[]
  rankings: RankingSummary[]
  /** Projected GC "on the road" (current GC time + live road gaps). */
  virtualGc?: RankingSummary
  /** Current wearers of the four leader jerseys. */
  jerseyHolders: JerseyHolder[]
  /** Aggregate live weather/wind conditions (present only while racing). */
  weather?: RaceWeather
  /** Full season calendar (all stages, sorted by number). */
  schedule: StageInfo[]
  route: RoutePoint[]
  lastUpdated?: string
  error?: string
  isLive?: boolean
  raceStatus?: boolean
  /** True on a Tour rest day (a gap day inside the race window). */
  isRestDay?: boolean
  /** Whether the race window has begun / finished for the current edition. */
  raceStarted?: boolean
  raceFinished?: boolean
  /** Summary of the next/upcoming stage (used by rest-day and pre-race screens). */
  nextStage?: StageInfo
  mock?: boolean
}

export function createEmptyState(year: number): LiveRaceState {
  return {
    connection: 'idle',
    year,
    groups: [],
    liveRiders: [],
    commentary: [],
    rankings: [],
    jerseyHolders: [],
    schedule: [],
    route: []
  }
}

// ---- IPC contract -------------------------------------------------------

export const IPC = {
  /** main -> renderer: full normalized state push */
  stateUpdate: 'race:state-update',
  /** renderer -> main: ask for the latest state immediately */
  requestState: 'race:request-state',
  /** renderer -> main: force a refresh of live data */
  refresh: 'race:refresh',
  /** renderer -> main: force SSE reconnect */
  reconnect: 'race:reconnect',
  /** renderer -> main: fetch a single rider's detail by id */
  requestRider: 'race:request-rider',
  /** renderer -> main: fetch a single team's detail by id */
  requestTeam: 'race:request-team',
  /** renderer -> main: fetch results for a (possibly past) stage */
  requestStageResults: 'race:request-stage-results'
} as const

export type ExposedApi = {
  onStateUpdate: (cb: (state: LiveRaceState) => void) => () => void
  requestState: () => Promise<LiveRaceState>
  refresh: () => void
  reconnect: () => void
  requestRider: (id: string) => Promise<RiderDetail | null>
  requestTeam: (id: string) => Promise<TeamDetail | null>
  requestStageResults: (year: number, stageNum: number) => Promise<StageResults | null>
}
