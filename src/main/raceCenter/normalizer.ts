import {
  JERSEY_CODES,
  RANKING_TYPE_LABELS,
  STAGE_TYPE_LABELS
} from '@shared/config'
import { formatHMS } from '@shared/time'
import type {
  JerseyHolder,
  LiveMessage,
  LiveRaceState,
  LiveRider,
  RaceConnectionState,
  RaceGroup,
  RaceWeather,
  RankingEntry,
  RankingSummary,
  Rider,
  RiderDetail,
  RoutePoint,
  StageInfo,
  StageResults,
  TeamDetail
} from '@shared/types'
import type {
  RawCheckpoint,
  RawCheckpointDoc,
  RawCity,
  RawCompetitor,
  RawFlashInfo,
  RawMillesime,
  RawRankingItem,
  RawRankingType,
  RawStage,
  RawTeam,
  RawTelemetryCompetitorDoc,
  RawTelemetryGroup,
  RawTelemetryPack,
  RawTelemetryRider
} from './types'
import { parseRef } from './refs'

export type NormalizerInput = {
  year: number
  stageNum?: number
  connection: RaceConnectionState
  millesime?: RawMillesime[]
  stages?: RawStage[]
  stageSingle?: RawStage[]
  teams?: RawTeam[]
  competitors?: RawCompetitor[]
  checkpointDoc?: RawCheckpointDoc[]
  flashInfo?: RawFlashInfo[]
  rankingTypes?: RawRankingType[]
  rankingJerseys?: RawRankingType[]
  telemetryPack?: RawTelemetryPack[]
  telemetryCompetitor?: RawTelemetryCompetitorDoc[]
  error?: string
  lastUpdated?: string
  /** Override "now" for rest-day / schedule computation (tests). */
  now?: Date
  mock?: boolean
}

// ---- small helpers ------------------------------------------------------

function cityLabel(city: RawCity | string | undefined): string | undefined {
  if (!city) return undefined
  if (typeof city === 'string') return city
  return city.label ?? undefined
}

function toNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function lengthDisplay(v: number | string | undefined): string | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'number') return `${v} km`
  return v
}

/** Format absolute race time given in milliseconds -> H:MM:SS or M:SS. */
export function formatClockMs(ms: number | undefined): string | undefined {
  if (ms === undefined || !Number.isFinite(ms) || ms <= 0) return undefined
  return formatHMS(ms / 1000)
}

/** Format a gap given in milliseconds -> +M:SS / +H:MM:SS, '' for leader. */
export function formatGapMs(ms: number | undefined): string | undefined {
  if (ms === undefined || !Number.isFinite(ms) || ms <= 0) return undefined
  return `+${formatClockMs(ms)}`
}

// ---- rider index --------------------------------------------------------

export type RiderIndex = {
  byId: Map<string, RawCompetitor>
  byBib: Map<number, RawCompetitor>
  teamsById: Map<string, RawTeam>
}

export function buildRiderIndex(
  competitors: RawCompetitor[] = [],
  teams: RawTeam[] = []
): RiderIndex {
  const byId = new Map<string, RawCompetitor>()
  const byBib = new Map<number, RawCompetitor>()
  const teamsById = new Map<string, RawTeam>()
  for (const t of teams) if (t?._id) teamsById.set(t._id, t)
  for (const c of competitors) {
    if (c?._id) byId.set(c._id, c)
    if (typeof c?.bib === 'number') byBib.set(c.bib, c)
  }
  return { byId, byBib, teamsById }
}

/** Full display name from a competitor, falling back to the short surname. */
function fullName(comp: RawCompetitor | undefined): string | undefined {
  if (!comp) return undefined
  const joined = [comp.firstname, comp.lastname].filter(Boolean).join(' ').trim()
  return joined || comp.lastnameshort || undefined
}

function resolveTeam(comp: RawCompetitor | undefined, index: RiderIndex): RawTeam | undefined {
  if (!comp?.$team) return undefined
  const parsed = parseRef(comp.$team)
  if (!parsed) return undefined
  return index.teamsById.get(parsed.id)
}

export function buildRider(
  comp: RawCompetitor | undefined,
  index: RiderIndex,
  jerseyByBib?: Map<number, string>
): Rider | undefined {
  if (!comp || !comp._id) return undefined
  const team = resolveTeam(comp, index)
  const bib = typeof comp.bib === 'number' ? comp.bib : undefined
  return {
    id: comp._id,
    bib,
    firstName: comp.firstname ?? undefined,
    lastName: comp.lastname ?? undefined,
    shortName: comp.lastnameshort ?? comp.lastname ?? undefined,
    nationality: comp.nationality ?? undefined,
    teamId: team?._id,
    teamCode: team?.code,
    teamName: team?.name,
    teamColor: team?.color,
    profileImage: comp.profile_sm ?? comp.profile ?? undefined,
    jersey: bib !== undefined ? jerseyByBib?.get(bib) : undefined
  }
}

// ---- jersey holders -----------------------------------------------------

const JERSEY_LABEL: Record<string, string> = {
  [JERSEY_CODES.yellow]: 'yellow',
  [JERSEY_CODES.green]: 'green',
  [JERSEY_CODES.polkaDot]: 'polkaDot',
  [JERSEY_CODES.white]: 'white'
}

/** Map bib -> jersey color name, from the jersey rankings (leader = position 1). */
export function buildJerseyByBib(rankingJerseys: RawRankingType[] = []): Map<number, string> {
  const out = new Map<number, string>()
  for (const rt of rankingJerseys) {
    const color = rt.type ? JERSEY_LABEL[rt.type] : undefined
    if (!color || !Array.isArray(rt.rankings)) continue
    const leader = [...rt.rankings]
      .filter((r) => typeof r.position === 'number' && r.position > 0 && typeof r.bib === 'number')
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]
    if (leader && typeof leader.bib === 'number') out.set(leader.bib, color)
  }
  return out
}

// ---- stage --------------------------------------------------------------

/**
 * Time trials have showGroups=false. EQU is a team time trial; any other
 * showGroups=false stage (e.g. PAS for stage 16/2026) is an individual time trial.
 */
function timeTrialKind(type: string | undefined, showGroups: boolean | undefined): 'team' | 'individual' | undefined {
  if (showGroups !== false) return undefined
  return type === 'EQU' ? 'team' : 'individual'
}

export function stageFromRaw(
  raw: RawStage | undefined,
  year: number,
  stageNum?: number
): StageInfo | undefined {
  if (!raw && stageNum === undefined) return undefined
  const type = raw?.type
  const showGroups = raw?.showGroups
  const ttKind = timeTrialKind(type, showGroups)
  const typeLabel = ttKind
    ? ttKind === 'team'
      ? 'Team time trial'
      : 'Individual time trial'
    : type
      ? (STAGE_TYPE_LABELS[type] ?? type)
      : undefined
  return {
    year,
    stageNum: stageNum ?? raw?.stage ?? 0,
    id: raw?.id !== undefined ? String(raw.id) : undefined,
    date: raw?.date,
    type,
    typeLabel,
    departureCity: cityLabel(raw?.departureCity),
    arrivalCity: cityLabel(raw?.arrivalCity),
    lengthKm: toNum(raw?.length),
    lengthDisplay: lengthDisplay(raw?.lengthDisplay),
    startTime: raw?.startTime,
    endTime: raw?.endTime,
    timezone: raw?.timezone,
    isCancelled: raw?.isCancelled,
    showGroups,
    isTimeTrial: ttKind !== undefined,
    timeTrialKind: ttKind
  }
}

export function normalizeStage(input: NormalizerInput): StageInfo | undefined {
  const single = input.stageSingle?.[0]
  const fromList = input.stages?.find((s) => s.stage === input.stageNum)
  return stageFromRaw(single ?? fromList, input.year, input.stageNum)
}

/** The full season calendar as StageInfo[], sorted by stage number. */
export function normalizeSchedule(input: NormalizerInput): StageInfo[] {
  const out: StageInfo[] = []
  for (const raw of input.stages ?? []) {
    if (typeof raw.stage !== 'number') continue
    const stage = stageFromRaw(raw, input.year, raw.stage)
    if (stage) out.push(stage)
  }
  return out.sort((a, b) => a.stageNum - b.stageNum)
}

// ---- schedule / rest days -----------------------------------------------

function localDateKey(d: Date): string {
  // YYYY-MM-DD in local time (race runs on the user's clock, typically CET).
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type DayContext = {
  isRestDay: boolean
  raceStarted: boolean
  raceFinished: boolean
  nextStage?: StageInfo
}

/**
 * Determine whether "today" is a rest day. Every race day has exactly one stage,
 * so any gap day inside the race window (e.g. 2026-07-13, 2026-07-20) is a rest day.
 */
export function computeDayContext(
  stages: RawStage[] = [],
  year: number,
  now: Date = new Date()
): DayContext {
  const dated = stages
    .filter((s) => typeof s.stage === 'number' && typeof s.date === 'string')
    .map((s) => ({ raw: s, key: (s.date as string).slice(0, 10) }))
    .sort((a, b) => a.key.localeCompare(b.key))

  if (dated.length === 0) {
    return { isRestDay: false, raceStarted: false, raceFinished: false }
  }

  const today = localDateKey(now)
  const firstKey = dated[0].key
  const lastKey = dated[dated.length - 1].key
  const stageDays = new Set(dated.map((d) => d.key))

  const raceStarted = today >= firstKey
  const raceFinished = today > lastKey
  const isRestDay = raceStarted && !raceFinished && !stageDays.has(today)

  const upcoming = dated.find((d) => d.key >= today)?.raw
  const nextStage = upcoming ? stageFromRaw(upcoming, year, upcoming.stage) : undefined

  return { isRestDay, raceStarted, raceFinished, nextStage }
}

// ---- groups -------------------------------------------------------------

function normalizeGroup(
  raw: RawTelemetryGroup,
  fallbackIndex: number,
  index: RiderIndex,
  jerseyByBib: Map<number, string>
): RaceGroup {
  const bibs = Array.isArray(raw.bibs) ? raw.bibs.filter((b) => typeof b === 'number') : []
  const riders: Rider[] = []
  for (const bib of bibs) {
    const comp = index.byBib.get(bib)
    const rider = buildRider(comp, index, jerseyByBib)
    if (rider) riders.push(rider)
    else riders.push({ id: `bib-${bib}`, bib, jersey: jerseyByBib.get(bib) })
  }

  return {
    id: raw.name ? `group-${raw.name}` : `group-${fallbackIndex}`,
    name: raw.name ?? `Group ${fallbackIndex + 1}`,
    order: fallbackIndex,
    size: toNum(raw.size) ?? (bibs.length || undefined),
    riders,
    bibs,
    latitude: toNum(raw.latitude),
    longitude: toNum(raw.longitude),
    speedKmh: toNum(raw.speed),
    gapToLeaderSeconds: toNum(raw.relative),
    gapToPreviousSeconds: toNum(raw.secGapToPrev),
    remainingDistanceKm: toNum(raw.computedRemainingDistance),
    completedDistanceKm: toNum(raw.completedDistance),
    hasYellowJersey: raw.hasYellowJersey,
    hasGreenJersey: raw.hasGreenJersey,
    hasPolkaDotJersey: raw.hasPolkaDotJersey,
    hasWhiteJersey: raw.hasWhiteJersey,
    localization: raw.localization
  }
}

/**
 * Order groups front-to-back: most completed distance first, then least remaining,
 * then smallest gap to leader, then original order. Re-assigns `.order`.
 */
export function orderGroups(groups: RaceGroup[]): RaceGroup[] {
  const sorted = [...groups].sort((a, b) => {
    const ca = a.completedDistanceKm
    const cb = b.completedDistanceKm
    if (ca !== undefined && cb !== undefined && ca !== cb) return cb - ca
    const ra = a.remainingDistanceKm
    const rb = b.remainingDistanceKm
    if (ra !== undefined && rb !== undefined && ra !== rb) return ra - rb
    const ga = a.gapToLeaderSeconds
    const gb = b.gapToLeaderSeconds
    if (ga !== undefined && gb !== undefined && ga !== gb) return ga - gb
    return a.order - b.order
  })
  return sorted.map((g, i) => ({ ...g, order: i }))
}

function packTime(p: RawTelemetryPack): number {
  if (typeof p.date === 'number') return p.date
  if (typeof p.date === 'string') {
    const t = Date.parse(p.date)
    if (!Number.isNaN(t)) return t
  }
  if (typeof p._updatedAt === 'number') return p._updatedAt
  if (typeof p._updatedAt === 'string') {
    const t = Date.parse(p._updatedAt)
    if (!Number.isNaN(t)) return t
  }
  return 0
}

/** Pick the freshest telemetry pack that actually has groups. */
export function pickLatestPack(packs: RawTelemetryPack[] = []): RawTelemetryPack | undefined {
  return packs
    .filter((p) => Array.isArray(p.groups) && p.groups.length > 0)
    .sort((a, b) => packTime(b) - packTime(a))[0]
}

export function normalizeGroups(input: NormalizerInput, index: RiderIndex): RaceGroup[] {
  const pack = pickLatestPack(input.telemetryPack)
  const rawGroups = pack?.groups ?? []
  if (rawGroups.length === 0) return []
  const jerseyByBib = buildJerseyByBib(input.rankingJerseys)
  const groups = rawGroups.map((g, i) => normalizeGroup(g, i, index, jerseyByBib))
  return orderGroups(groups)
}

// ---- live riders (telemetryCompetitor) ----------------------------------

const TC_JERSEY: Record<string, string> = {
  Y: 'yellow',
  G: 'green',
  P: 'polkaDot',
  W: 'white'
}

/**
 * Pick the freshest snapshot that has riders. StageId is a DB id (not the stage
 * number), so we just take the snapshot with the newest TimeStamp.
 */
export function pickLatestCompetitorDoc(
  docs: RawTelemetryCompetitorDoc[] = []
): RawTelemetryCompetitorDoc | undefined {
  const withRiders = docs.filter((d) => Array.isArray(d.Riders) && d.Riders.length > 0)
  if (withRiders.length === 0) return undefined
  return withRiders.sort((a, b) => (b.TimeStamp ?? 0) - (a.TimeStamp ?? 0))[0]
}

function normalizeLiveRider(r: RawTelemetryRider, index: RiderIndex): LiveRider | undefined {
  if (typeof r.Bib !== 'number') return undefined
  const comp = index.byBib.get(r.Bib)
  const team = resolveTeam(comp, index)
  const lat = toNum(r.Latitude) ?? toNum(r.LatLon?.[0])
  const lon = toNum(r.Longitude) ?? toNum(r.LatLon?.[1])
  return {
    id: comp?._id ?? `bib-${r.Bib}`,
    bib: r.Bib,
    riderName: fullName(comp),
    shortName: comp?.lastnameshort ?? comp?.lastname ?? undefined,
    teamName: team?.name,
    teamColor: team?.color,
    jersey: r.Jersey ? TC_JERSEY[r.Jersey] : undefined,
    latitude: lat,
    longitude: lon,
    speedKmh: toNum(r.kph),
    avgSpeedKmh: toNum(r.kphAvg),
    gradient: toNum(r.Gradient),
    kmToFinish: toNum(r.kmToFinish),
    gapToLeaderSeconds: toNum(r.secToFirstRider) ?? toNum(r.secToITTLead),
    position: toNum(r.Pos),
    status: r.Status,
    tempC: toNum(r.degC),
    windKmh: toNum(r.kphWind),
    windRelDeg: toNum(r.RiderWindDir)
  }
}

export function normalizeLiveRiders(input: NormalizerInput, index: RiderIndex): LiveRider[] {
  const doc = pickLatestCompetitorDoc(input.telemetryCompetitor)
  if (!doc?.Riders) return []
  const out: LiveRider[] = []
  for (const r of doc.Riders) {
    const lr = normalizeLiveRider(r, index)
    if (lr) out.push(lr)
  }
  out.sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999))
  return out
}

// ---- weather / wind / echelons ------------------------------------------

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

const DEG2RAD = Math.PI / 180

/**
 * Aggregate per-rider temperature and wind into a single race-wide reading and
 * derive crosswind/echelon risk. Wind direction is a circular mean; echelon risk
 * scales with the sideways wind component (sin of the relative angle) × speed —
 * the classic crosswind-splits-the-bunch scenario.
 */
export function computeWeather(riders: LiveRider[]): RaceWeather | undefined {
  const temps = riders.map((r) => r.tempC).filter((n): n is number => typeof n === 'number')
  const windKmhs = riders.map((r) => r.windKmh).filter((n): n is number => typeof n === 'number')
  const dirs = riders.filter(
    (r) => typeof r.windKmh === 'number' && typeof r.windRelDeg === 'number'
  )

  const tempC = temps.length ? Math.round(mean(temps)) : undefined
  const windKmh = windKmhs.length ? Math.round(mean(windKmhs)) : undefined

  let windRelDeg: number | undefined
  let windType: RaceWeather['windType']
  let echelonRisk: RaceWeather['echelonRisk'] = 'none'

  if (dirs.length > 0) {
    const sin = mean(dirs.map((r) => Math.sin((r.windRelDeg as number) * DEG2RAD)))
    const cos = mean(dirs.map((r) => Math.cos((r.windRelDeg as number) * DEG2RAD)))
    let deg = Math.atan2(sin, cos) / DEG2RAD
    if (deg < 0) deg += 360
    windRelDeg = Math.round(deg)

    const cross = Math.abs(Math.sin(deg * DEG2RAD)) // 1 at 90°/270° (pure crosswind)
    const along = Math.cos(deg * DEG2RAD) // +1 headwind, −1 tailwind
    windType = cross > 0.5 ? 'cross' : along > 0 ? 'head' : 'tail'

    const effectiveCross = (windKmh ?? 0) * cross
    if ((windKmh ?? 0) >= 10) {
      echelonRisk =
        effectiveCross >= 25
          ? 'high'
          : effectiveCross >= 15
            ? 'moderate'
            : effectiveCross >= 8
              ? 'low'
              : 'none'
    }
  }

  if (tempC === undefined && windKmh === undefined) return undefined
  return { tempC, windKmh, windRelDeg, windType, echelonRisk, sampleCount: riders.length }
}

// ---- jersey holders -----------------------------------------------------

const JERSEY_ORDER: { code: string; jersey: JerseyHolder['jersey'] }[] = [
  { code: JERSEY_CODES.yellow, jersey: 'yellow' },
  { code: JERSEY_CODES.green, jersey: 'green' },
  { code: JERSEY_CODES.polkaDot, jersey: 'polkaDot' },
  { code: JERSEY_CODES.white, jersey: 'white' }
]

/** Resolve the current wearer of each leader jersey from the jersey rankings. */
export function normalizeJerseyHolders(input: NormalizerInput, index: RiderIndex): JerseyHolder[] {
  const out: JerseyHolder[] = []
  for (const { code, jersey } of JERSEY_ORDER) {
    const rt = (input.rankingJerseys ?? []).find((r) => r.type === code)
    const leader = rt?.rankings?.find((r) => r.position === 1)
    if (!leader) continue
    const comp =
      typeof leader.bib === 'number'
        ? index.byBib.get(leader.bib)
        : index.byId.get(parseRef(leader.$rider)?.id ?? '')
    const team = resolveTeam(comp, index)
    const name = fullName(comp) ?? (typeof leader.bib === 'number' ? `#${leader.bib}` : undefined)
    if (!name) continue
    out.push({
      jersey,
      riderId: comp?._id,
      riderName: name,
      teamName: team?.name,
      teamColor: team?.color
    })
  }
  return out
}

// ---- commentary ---------------------------------------------------------

function flashTimestamp(f: RawFlashInfo): string | undefined {
  if (typeof f.date === 'number') return new Date(f.date).toISOString()
  if (typeof f.date === 'string') return f.date
  if (f.time) return f.time
  return undefined
}

export function normalizeCommentary(input: NormalizerInput): LiveMessage[] {
  const raw = input.flashInfo ?? []
  const messages: LiveMessage[] = []
  for (let i = 0; i < raw.length; i++) {
    const f = raw[i]
    const text = (f.text ?? f.content ?? f.message ?? '').toString().trim()
    if (!text) continue
    messages.push({
      id: f._id ?? (f.id !== undefined ? String(f.id) : `flash-${i}`),
      timestamp: flashTimestamp(f),
      title: f.title,
      text
    })
  }
  // Newest first when timestamps available.
  messages.sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0
    return tb - ta
  })
  return messages
}

// ---- rankings -----------------------------------------------------------

function normalizeRankingEntry(
  item: RawRankingItem,
  index: RiderIndex
): RankingEntry | undefined {
  if (typeof item.position !== 'number' || item.position <= 0) return undefined
  const parsed = parseRef(item.$rider)
  const comp = parsed ? index.byId.get(parsed.id) : undefined
  const team = resolveTeam(comp, index)
  return {
    position: item.position,
    bib: typeof item.bib === 'number' ? item.bib : undefined,
    riderId: comp?._id,
    riderName: fullName(comp),
    teamId: team?._id,
    teamName: team?.name,
    teamColor: team?.color,
    absoluteMs: toNum(item.absolute),
    relativeMs: toNum(item.relative),
    timeDisplay: formatClockMs(toNum(item.absolute)),
    gapDisplay: formatGapMs(toNum(item.relative))
  }
}

export function normalizeRankings(
  input: NormalizerInput,
  index: RiderIndex,
  limit = 30
): RankingSummary[] {
  const all = [...(input.rankingTypes ?? []), ...(input.rankingJerseys ?? [])]
  const summaries: RankingSummary[] = []
  for (const rt of all) {
    if (!rt.type || !Array.isArray(rt.rankings)) continue
    const entries = rt.rankings
      .map((r) => normalizeRankingEntry(r, index))
      .filter((e): e is RankingEntry => e !== undefined)
      .sort((a, b) => a.position - b.position)
      .slice(0, limit)
    if (entries.length === 0) continue
    summaries.push({
      type: rt.type,
      label: RANKING_TYPE_LABELS[rt.type] ?? rt.type,
      status: rt.status,
      checkpoint: rt.checkpoint,
      entries
    })
  }
  return summaries
}

/** Assemble on-demand stage results (finishing order + GC) for any stage. */
export function buildStageResults(input: NormalizerInput, index: RiderIndex): StageResults {
  const rankings = normalizeRankings(input, index)
  return {
    year: input.year,
    stageNum: input.stageNum ?? 0,
    stage: normalizeStage(input),
    stageResult: rankings.find((r) => r.type === 'ete'),
    gc: rankings.find((r) => r.type === 'etg'),
    hasData: rankings.length > 0
  }
}

// ---- route --------------------------------------------------------------

export function normalizeRoute(input: NormalizerInput): RoutePoint[] {
  const doc = input.checkpointDoc?.[0]
  if (!doc) return []
  const points: { key: number; cp: RawCheckpoint }[] = []
  for (const [k, v] of Object.entries(doc)) {
    if (!/^\d+$/.test(k)) continue
    const cp = v as RawCheckpoint
    if (cp && typeof cp.latitude === 'number' && typeof cp.longitude === 'number') {
      points.push({ key: Number(k), cp })
    }
  }
  points.sort((a, b) => a.key - b.key)
  return points.map(({ cp }, i) => {
    const summit = cp.checkpointSummits?.[0]
    // checkpointTypes are objects { type, code, ... } — extract the short code.
    const types = Array.isArray(cp.checkpointTypes)
      ? cp.checkpointTypes
          .map((t) => (typeof t === 'string' ? t : t?.code))
          .filter((c): c is string => typeof c === 'string' && c.length > 0)
      : []
    return {
      index: i,
      checkpointNumber: toNum(cp.checkpoint),
      name: cp.place ?? cp.road ?? undefined,
      latitude: cp.latitude as number,
      longitude: cp.longitude as number,
      lengthKm: toNum(cp.length),
      types,
      summitName: summit?.summit?.name,
      summitAltitude: toNum(summit?.summit?.altitude),
      summitCategory: summit?.code,
      summitGradient: toNum(summit?.state)
    }
  })
}

// ---- rider / team detail ------------------------------------------------

export function buildRiderDetail(
  comp: RawCompetitor | undefined,
  index: RiderIndex,
  jerseyByBib?: Map<number, string>
): RiderDetail | null {
  const base = buildRider(comp, index, jerseyByBib)
  if (!base || !comp) return null
  return {
    ...base,
    birthdate: comp.birthdate ?? undefined,
    uciCode: comp.UCICode ?? (comp.idUCI !== undefined ? String(comp.idUCI) : undefined),
    victories: toNum(comp.victories),
    podiums: toNum(comp.podiums),
    profileImageLarge: comp.profile ?? comp.profile_sm ?? undefined
  }
}

export function buildTeamDetail(
  team: RawTeam | undefined,
  competitors: RawCompetitor[] = [],
  index?: RiderIndex
): TeamDetail | null {
  if (!team || !team._id) return null
  const idx = index ?? buildRiderIndex(competitors, [team])
  const riders: Rider[] = []
  for (const comp of competitors) {
    const parsed = parseRef(comp.$team)
    if (parsed?.id !== team._id) continue
    const r = buildRider(comp, idx)
    if (r) riders.push(r)
  }
  riders.sort((a, b) => (a.bib ?? 9999) - (b.bib ?? 9999))
  return {
    id: team._id,
    code: team.code,
    name: team.name,
    nameShort: team.nameShort,
    nationality: team.nationality,
    color: team.color,
    jerseyImage: team.jersey_sm ?? team.jersey ?? undefined,
    logo: team.logo_live ?? team.logo ?? undefined,
    riders
  }
}

// ---- virtual GC ---------------------------------------------------------

/**
 * Project the general classification "on the road": each GC rider's overall time
 * plus the time gap of the group they're currently in. Ordering by (GC time +
 * road gap) gives the live/virtual standings — i.e. who would be in yellow right
 * now. Only meaningful when the race is split with real gaps.
 */
export function computeVirtualGc(
  groups: RaceGroup[],
  rankings: RankingSummary[]
): RankingSummary | undefined {
  const gc = rankings.find((r) => r.type === 'etg')
  if (!gc || gc.entries.length === 0) return undefined
  if (groups.length < 2) return undefined
  if (!groups.some((g) => (g.gapToLeaderSeconds ?? 0) > 0)) return undefined

  // Map each bib to its current on-road gap; default unplaced riders to the bunch.
  const roadGap = new Map<number, number>()
  let pelotonGap = 0
  let pelotonSize = -1
  for (const g of groups) {
    const gap = g.gapToLeaderSeconds ?? 0
    const size = g.size ?? g.bibs.length
    if (size > pelotonSize) {
      pelotonSize = size
      pelotonGap = gap
    }
    for (const bib of g.bibs) roadGap.set(bib, gap)
  }

  // The leader carries the cumulative time; rivals may only have a relative gap,
  // so reconstruct their absolute time from leader + relative when needed.
  const baseAbsolute = gc.entries.find((e) => e.position === 1)?.absoluteMs
  if (baseAbsolute === undefined) return undefined

  const items = gc.entries
    .filter((e) => e.bib !== undefined)
    .map((e) => {
      const abs = e.absoluteMs ?? baseAbsolute + (e.relativeMs ?? 0)
      const rg = roadGap.get(e.bib as number) ?? pelotonGap
      return { entry: e, vKey: abs + rg * 1000 }
    })
  if (items.length === 0) return undefined

  items.sort((a, b) => a.vKey - b.vKey)
  const min = items[0].vKey

  const entries: RankingEntry[] = items.slice(0, 10).map((it, i) => ({
    position: i + 1,
    bib: it.entry.bib,
    riderId: it.entry.riderId,
    riderName: it.entry.riderName,
    teamName: it.entry.teamName,
    teamColor: it.entry.teamColor,
    relativeMs: it.vKey - min,
    gapDisplay: formatGapMs(it.vKey - min)
  }))

  return { type: 'virtual', label: 'On the road (virtual GC)', entries }
}

// ---- top-level ----------------------------------------------------------

export function isStageLive(input: NormalizerInput): boolean {
  const edition = input.millesime?.find((m) => m.year === input.year)
  if (edition?.isLive) return true
  if ((input.telemetryPack ?? []).some((p) => Array.isArray(p.groups) && p.groups.length > 0)) {
    return true
  }
  // Live per-rider telemetry also means the stage is in progress (covers time trials).
  return pickLatestCompetitorDoc(input.telemetryCompetitor) !== undefined
}

export function buildRaceState(input: NormalizerInput): LiveRaceState {
  const index = buildRiderIndex(input.competitors, input.teams)
  const doc = pickLatestCompetitorDoc(input.telemetryCompetitor)
  const day = computeDayContext(input.stages, input.year, input.now)
  const groups = normalizeGroups(input, index)
  const rankings = normalizeRankings(input, index)
  const liveRiders = normalizeLiveRiders(input, index)
  return {
    connection: input.connection,
    year: input.year,
    stageNum: input.stageNum,
    stage: normalizeStage(input),
    groups,
    liveRiders,
    commentary: normalizeCommentary(input),
    rankings,
    virtualGc: computeVirtualGc(groups, rankings),
    jerseyHolders: normalizeJerseyHolders(input, index),
    weather: computeWeather(liveRiders),
    schedule: normalizeSchedule(input),
    route: normalizeRoute(input),
    lastUpdated: input.lastUpdated,
    error: input.error,
    isLive: isStageLive(input),
    raceStatus: doc?.RaceStatus,
    isRestDay: day.isRestDay,
    raceStarted: day.raceStarted,
    raceFinished: day.raceFinished,
    nextStage: day.nextStage,
    mock: input.mock
  }
}
