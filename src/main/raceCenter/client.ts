import { RACE_CENTER_BASE_URL, REQUEST_TIMEOUT_MS } from '@shared/config'
import type { RawMillesime, RawStage } from './types'

export type FetchLike = typeof fetch

/** Bind-name builders. These map 1:1 to `/api/{bindName}` paths. */
export const binds = {
  millesime: () => 'millesime',
  event: () => 'event',
  social: () => 'social',
  team: (year: number) => `team-${year}`,
  stage: (year: number) => `stage-${year}`,
  stageByNum: (year: number, stageNum: number) => `stage-${year}/${stageNum}`,
  competitors: (year: number) => `allCompetitors-${year}`,
  checkpoint: (year: number, stageNum: number) => `checkpoint-${year}-${stageNum}`,
  flashInfo: (year: number, stageNum: number) => `flashInfoLive-${year}-${stageNum}`,
  rankingType: (year: number, stageNum: number) => `rankingType-${year}-${stageNum}`,
  rankingJerseys: (year: number, stageNum: number) => `rankingTypeJerseys-${year}-${stageNum}`,
  telemetryPack: (year: number, stageNum: number) => `telemetryPack-${year}-${stageNum}`,
  telemetryCompetitor: (year: number) => `telemetryCompetitor-${year}`,
  vehicles: (year: number, stageNum: number) => `vehicles-${year}-${stageNum}`
} as const

export class RaceCenterError extends Error {
  constructor(
    message: string,
    readonly bindName: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'RaceCenterError'
  }
}

export type RaceCenterClientOptions = {
  baseUrl?: string
  fetchFn?: FetchLike
  timeoutMs?: number
}

/** Coerce any API response into an array of records. */
function toRecords(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data === null || data === undefined) return []
  return [data]
}

export class RaceCenterClient {
  private baseUrl: string
  private fetchFn: FetchLike
  private timeoutMs: number

  constructor(opts: RaceCenterClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? RACE_CENTER_BASE_URL).replace(/\/$/, '')
    this.fetchFn = opts.fetchFn ?? fetch
    this.timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS
  }

  buildUrl(bindName: string, from?: number): string {
    const base = `${this.baseUrl}/api/${bindName}`
    return from !== undefined && Number.isFinite(from) ? `${base}?from=${from}` : base
  }

  /**
   * Fetch a bind group. Always resolves to an array of records (empty on failure
   * is the caller's decision — here we throw RaceCenterError so callers can decide).
   */
  async getBind(bindName: string, from?: number): Promise<unknown[]> {
    const url = this.buildUrl(bindName, from)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await this.fetchFn(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      })
      if (!res.ok) {
        throw new RaceCenterError(`HTTP ${res.status} for ${bindName}`, bindName, res.status)
      }
      const text = await res.text()
      if (!text.trim()) return []
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new RaceCenterError(`Invalid JSON for ${bindName}`, bindName)
      }
      return toRecords(parsed)
    } catch (err) {
      if (err instanceof RaceCenterError) throw err
      const reason = err instanceof Error ? err.message : String(err)
      throw new RaceCenterError(`Request failed for ${bindName}: ${reason}`, bindName)
    } finally {
      clearTimeout(timer)
    }
  }

  /** getBind that never throws — returns [] on any failure. Useful for optional data. */
  async getBindSafe(bindName: string, from?: number): Promise<unknown[]> {
    try {
      return await this.getBind(bindName, from)
    } catch {
      return []
    }
  }
}

// ---- Pure detection helpers (exported for testing) ----------------------

/**
 * Pick the active edition year. Prefers an edition with `isLive: true`, otherwise
 * the requested default if present, otherwise the most recent year available.
 */
export function detectCurrentYear(
  millesime: RawMillesime[],
  preferredYear: number
): number {
  const live = millesime.find((m) => m.isLive && typeof m.year === 'number')
  if (live?.year) return live.year

  const years = millesime
    .map((m) => m.year)
    .filter((y): y is number => typeof y === 'number')

  if (years.includes(preferredYear)) return preferredYear
  if (years.length > 0) return Math.max(...years)
  return preferredYear
}

/**
 * Pick the current stage number. Strategy: the stage whose date is today, else the
 * next upcoming stage, else the most recent past stage, else the default.
 */
export function detectCurrentStage(
  stages: RawStage[],
  preferredStage: number,
  now: Date = new Date()
): number {
  const dated = stages
    .map((s) => ({ stage: s.stage, time: s.date ? Date.parse(s.date) : NaN }))
    .filter((s): s is { stage: number; time: number } =>
      typeof s.stage === 'number' && !Number.isNaN(s.time)
    )
    .sort((a, b) => a.time - b.time)

  if (dated.length === 0) {
    const anyStage = stages.find((s) => typeof s.stage === 'number')?.stage
    return anyStage ?? preferredStage
  }

  const nowMs = now.getTime()
  const dayMs = 24 * 60 * 60 * 1000

  // Same calendar-day-ish window (stage date is midnight local; allow the whole day).
  const sameDay = dated.find((s) => nowMs >= s.time && nowMs < s.time + dayMs)
  if (sameDay) return sameDay.stage

  const upcoming = dated.find((s) => s.time >= nowMs)
  if (upcoming) return upcoming.stage

  return dated[dated.length - 1].stage
}
