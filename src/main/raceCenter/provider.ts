import { DEFAULT_STAGE, DEFAULT_YEAR, FALLBACK_POLL_MS } from '@shared/config'
import type {
  LiveRaceState,
  RaceConnectionState,
  RiderDetail,
  StageResults,
  TeamDetail
} from '@shared/types'
import { RaceCache } from './cache'
import { RaceCenterClient, binds, detectCurrentStage, detectCurrentYear } from './client'
import {
  buildJerseyByBib,
  buildRaceState,
  buildRiderDetail,
  buildRiderIndex,
  buildStageResults,
  buildTeamDetail,
  type NormalizerInput,
  type RiderIndex
} from './normalizer'
import { RaceSseClient } from './sse'
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
} from './types'

export interface RaceSource {
  start(): Promise<void>
  refresh(): Promise<void>
  reconnect(): void
  stop(): void
  getState(): LiveRaceState
  getRiderDetail(id: string): RiderDetail | null
  getTeamDetail(id: string): TeamDetail | null
  getStageResults(year: number, stageNum: number): Promise<StageResults | null>
}

export type RaceProviderOptions = {
  year?: number
  stage?: number
  client?: RaceCenterClient
  cache?: RaceCache
  onState: (state: LiveRaceState) => void
}

/**
 * Owns the Race Center client + SSE connection + cache, and emits normalized
 * LiveRaceState. Never throws out of its loops — failures set connection state.
 */
export class RaceProvider implements RaceSource {
  private client: RaceCenterClient
  private cache: RaceCache
  private sse?: RaceSseClient
  private onState: (state: LiveRaceState) => void

  private year: number
  private stageNum: number
  private connection: RaceConnectionState = 'idle'
  private lastError?: string
  private pollTimer?: ReturnType<typeof setInterval>
  private dayTimer?: ReturnType<typeof setInterval>
  private started = false

  constructor(opts: RaceProviderOptions) {
    this.client = opts.client ?? new RaceCenterClient()
    this.cache = opts.cache ?? new RaceCache()
    this.onState = opts.onState
    this.year = opts.year ?? DEFAULT_YEAR
    this.stageNum = opts.stage ?? DEFAULT_STAGE
  }

  async start(): Promise<void> {
    if (this.started) return
    this.started = true
    this.setConnection('loading')

    // Emit immediately if we have a persisted snapshot.
    if (this.cache.keys().length > 0) this.emit()

    await this.bootstrap()
    await this.fetchStageData()
    this.emit()
    this.connectSse()
    this.startPolling()
    this.startDayCheck()
  }

  /** Fetch season-wide base data and detect current year + stage. */
  private async bootstrap(): Promise<void> {
    try {
      const millesime = await this.client.getBindSafe(binds.millesime())
      if (millesime.length) this.cache.setFull(binds.millesime(), millesime)
      this.year = detectCurrentYear(millesime as RawMillesime[], this.year)

      const [stages, teams, competitors] = await Promise.all([
        this.client.getBindSafe(binds.stage(this.year)),
        this.client.getBindSafe(binds.team(this.year)),
        this.client.getBindSafe(binds.competitors(this.year))
      ])
      if (stages.length) this.cache.setFull(binds.stage(this.year), stages)
      if (teams.length) this.cache.setFull(binds.team(this.year), teams)
      if (competitors.length) this.cache.setFull(binds.competitors(this.year), competitors)

      this.stageNum = detectCurrentStage(stages as RawStage[], this.stageNum)
      this.setConnection('connected')
    } catch (err) {
      this.fail(err)
    }
  }

  /** Fetch per-stage live + static data for the current year/stage. */
  async fetchStageData(): Promise<void> {
    const y = this.year
    const s = this.stageNum
    try {
      const [single, checkpoint, telemetry, competitor, ranking, jerseys, flash] = await Promise.all([
        this.client.getBindSafe(binds.stageByNum(y, s)),
        this.client.getBindSafe(binds.checkpoint(y, s)),
        this.client.getBindSafe(binds.telemetryPack(y, s)),
        this.client.getBindSafe(binds.telemetryCompetitor(y)),
        this.client.getBindSafe(binds.rankingType(y, s)),
        this.client.getBindSafe(binds.rankingJerseys(y, s)),
        this.client.getBindSafe(binds.flashInfo(y, s))
      ])
      this.cache.setFull(binds.stageByNum(y, s), single)
      if (checkpoint.length) this.cache.setFull(binds.checkpoint(y, s), checkpoint)
      this.cache.setFull(binds.telemetryPack(y, s), telemetry)
      this.cache.setFull(binds.telemetryCompetitor(y), competitor)
      this.cache.setFull(binds.rankingType(y, s), ranking)
      this.cache.setFull(binds.rankingJerseys(y, s), jerseys)
      this.cache.setFull(binds.flashInfo(y, s), flash)
    } catch (err) {
      this.fail(err)
    }
  }

  async refresh(): Promise<void> {
    await this.fetchStageData()
    this.emit()
  }

  // ---- SSE ----

  private connectSse(): void {
    this.sse = new RaceSseClient({
      onOpen: () => this.setConnection('connected', true),
      onGroups: (map) => void this.handleGroups(map),
      onDisconnect: () => this.setConnection('reconnecting', true),
      onReconnectScheduled: () => this.setConnection('reconnecting', true)
    })
    this.sse.connect()
  }

  reconnect(): void {
    this.setConnection('reconnecting', true)
    this.sse?.reconnect()
  }

  /** Set of bind names we care about for the current year/stage. */
  private relevantBinds(): Set<string> {
    const y = this.year
    const s = this.stageNum
    return new Set([
      binds.team(y),
      binds.competitors(y),
      binds.telemetryPack(y, s),
      binds.telemetryCompetitor(y),
      binds.rankingType(y, s),
      binds.rankingJerseys(y, s),
      binds.flashInfo(y, s),
      binds.checkpoint(y, s)
    ])
  }

  private async handleGroups(map: Record<string, number>): Promise<void> {
    const relevant = this.relevantBinds()
    const toFetch: { bind: string; from?: number }[] = []
    for (const [bind, ts] of Object.entries(map)) {
      if (!relevant.has(bind) && !this.cache.has(bind)) continue
      const localTs = this.cache.getTimestamp(bind)
      if (localTs !== undefined && localTs >= ts) continue
      toFetch.push({ bind, from: localTs })
    }
    if (toFetch.length === 0) return

    let changed = false
    for (const { bind, from } of toFetch) {
      try {
        // Telemetry binds are multi-snapshot streams; always replace with a full
        // fetch so the cache can't grow unbounded over a long stage.
        if (this.isReplaceableBind(bind) || from === undefined) {
          const records = await this.client.getBind(bind)
          this.cache.setFull(bind, records, map[bind])
        } else {
          const records = await this.client.getBind(bind, from)
          this.cache.mergeIncremental(bind, records, map[bind])
        }
        changed = true
      } catch {
        // One bind failing must not abort the others.
      }
    }
    if (changed) {
      this.setConnection('connected', true)
      this.emit()
    }
  }

  // ---- polling fallback ----

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      void this.pollLiveData()
    }, FALLBACK_POLL_MS)
  }

  // ---- daily stage rollover ----

  /**
   * The Tour spans three weeks. Periodically re-fetch the season calendar and
   * re-detect the active year/stage so the app advances 1 → 2 → … → 21 on its own
   * (and follows rest days, which simply resolve to the next upcoming stage).
   */
  private startDayCheck(): void {
    this.dayTimer = setInterval(
      () => {
        void this.dayCheck()
      },
      30 * 60 * 1000
    )
  }

  private async dayCheck(): Promise<void> {
    try {
      const millesime = await this.client.getBindSafe(binds.millesime())
      if (millesime.length) this.cache.setFull(binds.millesime(), millesime)
      const detectedYear = detectCurrentYear(millesime as RawMillesime[], this.year)

      const stages = await this.client.getBindSafe(binds.stage(detectedYear))
      if (stages.length) this.cache.setFull(binds.stage(detectedYear), stages)

      const detectedStage = detectCurrentStage(stages as RawStage[], this.stageNum)
      if (detectedYear === this.year && detectedStage === this.stageNum) {
        // Same stage — still re-emit so the rest-day / date context refreshes.
        this.emit()
        return
      }

      this.year = detectedYear
      this.stageNum = detectedStage
      await this.fetchStageData()
      // SSE/poll read this.year/this.stageNum dynamically, so they now follow the
      // new stage automatically; just refresh the subscription on a clean slate.
      this.sse?.reconnect()
      this.emit()
    } catch {
      // Detection failures must never disturb the live loop.
    }
  }

  /** Multi-snapshot live streams that should always be fully replaced, never merged. */
  private isReplaceableBind(bind: string): boolean {
    return bind.startsWith('telemetryPack-') || bind.startsWith('telemetryCompetitor-')
  }

  private async pollLiveData(): Promise<void> {
    const y = this.year
    const s = this.stageNum
    const liveBinds = [
      binds.telemetryPack(y, s),
      binds.telemetryCompetitor(y),
      binds.flashInfo(y, s),
      binds.rankingType(y, s),
      binds.rankingJerseys(y, s)
    ]
    for (const bind of liveBinds) {
      const records = await this.client.getBindSafe(bind)
      // Live binds are singleton-ish/replaceable; full replace is fine.
      this.cache.setFull(bind, records)
    }
    this.emit()
  }

  // ---- state assembly ----

  private setConnection(state: RaceConnectionState, emit = false): void {
    if (this.connection === state) {
      if (emit) this.emit()
      return
    }
    this.connection = state
    if (emit) this.emit()
  }

  private fail(err: unknown): void {
    this.lastError = err instanceof Error ? err.message : String(err)
    this.connection = 'error'
  }

  private assembleInput(): NormalizerInput {
    const y = this.year
    const s = this.stageNum
    return {
      year: y,
      stageNum: s,
      connection: this.connection,
      millesime: this.cache.getRecords<RawMillesime>(binds.millesime()),
      stages: this.cache.getRecords<RawStage>(binds.stage(y)),
      stageSingle: this.cache.getRecords<RawStage>(binds.stageByNum(y, s)),
      teams: this.cache.getRecords<RawTeam>(binds.team(y)),
      competitors: this.cache.getRecords<RawCompetitor>(binds.competitors(y)),
      checkpointDoc: this.cache.getRecords<RawCheckpointDoc>(binds.checkpoint(y, s)),
      flashInfo: this.cache.getRecords<RawFlashInfo>(binds.flashInfo(y, s)),
      rankingTypes: this.cache.getRecords<RawRankingType>(binds.rankingType(y, s)),
      rankingJerseys: this.cache.getRecords<RawRankingType>(binds.rankingJerseys(y, s)),
      telemetryPack: this.cache.getRecords<RawTelemetryPack>(binds.telemetryPack(y, s)),
      telemetryCompetitor: this.cache.getRecords<RawTelemetryCompetitorDoc>(
        binds.telemetryCompetitor(y)
      ),
      error: this.lastError,
      lastUpdated: new Date().toISOString()
    }
  }

  getState(): LiveRaceState {
    return buildRaceState(this.assembleInput())
  }

  /** Cached competitors + teams plus the rider index built from them. */
  private rosterIndex(): { competitors: RawCompetitor[]; teams: RawTeam[]; index: RiderIndex } {
    const competitors = this.cache.getRecords<RawCompetitor>(binds.competitors(this.year))
    const teams = this.cache.getRecords<RawTeam>(binds.team(this.year))
    return { competitors, teams, index: buildRiderIndex(competitors, teams) }
  }

  getRiderDetail(id: string): RiderDetail | null {
    const { competitors, index } = this.rosterIndex()
    const comp = competitors.find((c) => c._id === id)
    if (!comp) return null
    const jerseyByBib = buildJerseyByBib(
      this.cache.getRecords<RawRankingType>(binds.rankingJerseys(this.year, this.stageNum))
    )
    return buildRiderDetail(comp, index, jerseyByBib)
  }

  getTeamDetail(id: string): TeamDetail | null {
    const { competitors, teams, index } = this.rosterIndex()
    const team = teams.find((t) => t._id === id)
    if (!team) return null
    return buildTeamDetail(team, competitors, index)
  }

  /** Fetch finishing order + GC for any stage (including past ones). */
  async getStageResults(year: number, stageNum: number): Promise<StageResults | null> {
    const { competitors, teams, index } = this.rosterIndex()
    try {
      const [stageArr, rankingArr] = await Promise.all([
        this.client.getBindSafe(binds.stageByNum(year, stageNum)),
        this.client.getBindSafe(binds.rankingType(year, stageNum))
      ])
      const input: NormalizerInput = {
        year,
        stageNum,
        connection: this.connection,
        stageSingle: stageArr as RawStage[],
        stages: this.cache.getRecords<RawStage>(binds.stage(year)),
        rankingTypes: rankingArr as RawRankingType[],
        competitors,
        teams
      }
      return buildStageResults(input, index)
    } catch {
      return null
    }
  }

  private emit(): void {
    try {
      this.onState(this.getState())
    } catch {
      // A renderer/IPC failure must not crash the provider.
    }
  }

  stop(): void {
    this.started = false
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.pollTimer = undefined
    if (this.dayTimer) clearInterval(this.dayTimer)
    this.dayTimer = undefined
    this.sse?.close()
    this.sse = undefined
  }
}
