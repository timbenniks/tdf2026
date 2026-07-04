// RAW Race Center payload types. Deliberately loose: the API has optional/nullable
// fields, numbered-key objects, and shape drift. Everything that touches these should
// guard before use. The normalizer turns these into the clean @shared/types.

/** Fields present on virtually every record. */
export type RawMeta = {
  _id?: string
  _key?: string
  _bind?: string
  _origin?: string
  _parent?: string
  _updatedAt?: number | string
  _virtual?: unknown
  _gets?: Record<string, string>
}

/** A city is an object; the display name is in `label`. */
export type RawCity = {
  id?: string | number
  code?: string
  label?: string
  cityLangs?: unknown
  content?: unknown
}

export type RawMillesime = RawMeta & {
  year?: number
  isLive?: boolean
  jerseys?: Record<string, string>
  jerseys_sm?: Record<string, string>
  timezone?: string
  maxAltitude?: number
  skale?: unknown
  hideCaravan?: boolean
  hideRadio?: boolean
}

export type RawStage = RawMeta & {
  stage?: number
  id?: number | string
  date?: string
  type?: string
  departureCity?: RawCity | string
  arrivalCity?: RawCity | string
  length?: number
  lengthDisplay?: number | string
  startTime?: string
  endTime?: string
  timezone?: string
  showGroups?: boolean
  isCancelled?: boolean
  podiumDisplayMode?: unknown
}

export type RawTeam = RawMeta & {
  code?: string
  name?: string
  nameShort?: string
  nationality?: string
  color?: string
  logo?: string
  logo_live?: string
  jersey?: string
  jersey_sm?: string
  banner?: string
  header?: string
}

export type RawCompetitor = RawMeta & {
  firstname?: string
  lastname?: string
  lastnameshort?: string
  nationality?: string
  birthdate?: string
  idUCI?: string | number
  UCICode?: string
  bib?: number | null
  sex?: string
  profile?: string | null
  profile_sm?: string | null
  profile_podium_live?: string | null
  $team?: string
  victories?: number
  podiums?: number
}

/** Each checkpoint type is an object; `code` is the short letter (F/R/N/C/A). */
export type RawCheckpointType = {
  type?: string
  id?: string | number
  number?: string | number
  code?: string
}

export type RawCheckpoint = {
  checkpoint?: number
  latitude?: number
  longitude?: number
  length?: number
  country?: string
  countryCode?: string
  place?: string
  road?: string
  checkpointTypes?: RawCheckpointType[]
  checkpointSummits?: RawCheckpointSummit[]
}

export type RawCheckpointSummit = {
  summit?: {
    name?: string
    altitude?: number
  }
  length?: number
  /** gradient percent, as string or number */
  state?: number | string
  /** climb category code */
  code?: string
}

/** checkpoint endpoint returns [ { "0": {...}, "1": {...}, ...meta } ] */
export type RawCheckpointDoc = RawMeta & {
  [index: string]: RawCheckpoint | unknown
}

export type RawFlashInfo = RawMeta & {
  id?: string | number
  date?: string | number
  time?: string
  text?: string
  title?: string
  content?: string
  message?: string
}

export type RawRankingItem = {
  position?: number
  bib?: number
  absolute?: number
  relative?: number
  bonus?: number
  penality?: number
  $rider?: string
}

export type RawRankingType = RawMeta & {
  type?: string
  status?: string
  checkpoint?: number
  length?: number
  rankings?: RawRankingItem[]
  types?: unknown
}

export type RawTelemetryGroup = {
  name?: string
  bibs?: number[]
  latitude?: number
  longitude?: number
  size?: number
  speed?: number
  relative?: number
  secGapToPrev?: number
  computedRemainingDistance?: number
  completedDistance?: number
  hasYellowJersey?: boolean
  hasGreenJersey?: boolean
  hasPolkaDotJersey?: boolean
  hasWhiteJersey?: boolean
  localization?: string
}

export type RawTelemetryPack = RawMeta & {
  date?: number | string
  type?: string
  groups?: RawTelemetryGroup[]
}

export type RawTelemetryRider = {
  Bib?: number
  Latitude?: number
  Longitude?: number
  LatLon?: [number, number]
  /** Jersey wearer code: Y/G/P/W or null. */
  Jersey?: string | null
  kph?: number
  kphAvg?: number
  Gradient?: number
  Course?: number
  mAlt?: number
  kmToFinish?: number
  secToFirstRider?: number
  secToITTLead?: number
  /** Live position/rank in the stage. */
  Pos?: number
  Status?: string
  degC?: number
  kphWind?: number
  RiderWindDir?: number
}

/** telemetryCompetitor returns an array of timestamped snapshots. */
export type RawTelemetryCompetitorDoc = RawMeta & {
  RaceStatus?: boolean
  RaceName?: string
  StageId?: string | number
  TimeStamp?: number
  /** Bibs of Yellow/Green/Polka/White wearers. */
  YGPW?: unknown
  Riders?: RawTelemetryRider[]
}

export type RawEvent = RawMeta & {
  adUnit?: unknown
  extras?: {
    radioUrl?: string
    hideInsideRace?: boolean
  }
}

/** A parsed reference like "team-2025:abc123". */
export type ParsedRef = { bind: string; id: string }
