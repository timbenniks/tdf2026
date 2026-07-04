import type { LiveRaceState, RiderDetail, StageResults, TeamDetail } from '@shared/types'
import {
  buildJerseyByBib,
  buildRaceState,
  buildRiderDetail,
  buildRiderIndex,
  buildStageResults,
  buildTeamDetail,
  type NormalizerInput
} from '../raceCenter/normalizer'
import type { RaceSource } from '../raceCenter/provider'
import {
  MOCK_REST_NOW,
  MOCK_STAGE,
  MOCK_TT_STAGE,
  MOCK_YEAR,
  buildMockCompetitor,
  buildMockEventStep,
  buildMockFlash,
  buildMockTelemetry,
  mockCheckpoint,
  mockCompetitors,
  mockJerseys,
  mockMillesime,
  mockRankings,
  mockRestCalendar,
  mockStage,
  mockStageTT,
  mockTeams
} from './fixtures'

export type MockProviderOptions = {
  onState: (state: LiveRaceState) => void
  /** How often to advance the simulated race (ms). */
  tickMs?: number
  /** Replay a team time-trial scenario (showGroups=false, per-rider telemetry). */
  timeTrial?: boolean
  /** Replay a rest day (no live data, next-stage screen). */
  restDay?: boolean
  /** Loop through a scripted event sequence (to exercise notifications). */
  events?: boolean
}

/**
 * Replays fabricated fixtures and slowly closes the gaps, so the tray title, groups,
 * commentary and rankings all render and animate without a live race.
 */
export class MockProvider implements RaceSource {
  private onState: (state: LiveRaceState) => void
  private tickMs: number
  private timeTrial: boolean
  private restDay: boolean
  private events: boolean
  private tick = 0
  private timer?: ReturnType<typeof setInterval>

  constructor(opts: MockProviderOptions) {
    this.onState = opts.onState
    this.tickMs = opts.tickMs ?? (opts.events ? 4_000 : 5_000)
    this.timeTrial = opts.timeTrial ?? false
    this.restDay = opts.restDay ?? false
    this.events = opts.events ?? false
  }

  async start(): Promise<void> {
    this.emit()
    this.timer = setInterval(() => {
      this.tick += 1
      this.emit()
    }, this.tickMs)
  }

  async refresh(): Promise<void> {
    this.tick += 1
    this.emit()
  }

  reconnect(): void {
    this.tick = 0
    this.emit()
  }

  getState(): LiveRaceState {
    return buildRaceState(this.assembleInput())
  }

  private rosterIndex(): ReturnType<typeof buildRiderIndex> {
    return buildRiderIndex(mockCompetitors, mockTeams)
  }

  getRiderDetail(id: string): RiderDetail | null {
    const comp = mockCompetitors.find((c) => c._id === id)
    if (!comp) return null
    const jerseyByBib = buildJerseyByBib(mockJerseys)
    return buildRiderDetail(comp, this.rosterIndex(), jerseyByBib)
  }

  getTeamDetail(id: string): TeamDetail | null {
    const team = mockTeams.find((t) => t._id === id)
    if (!team) return null
    return buildTeamDetail(team, mockCompetitors, this.rosterIndex())
  }

  async getStageResults(year: number, stageNum: number): Promise<StageResults | null> {
    return buildStageResults(
      {
        year,
        stageNum,
        connection: 'connected',
        stages: mockStage,
        stageSingle: mockStage,
        rankingTypes: mockRankings,
        teams: mockTeams,
        competitors: mockCompetitors
      },
      this.rosterIndex()
    )
  }

  private assembleInput(): NormalizerInput {
    // Fields shared by every scenario; each mode overrides only what differs.
    const base: NormalizerInput = {
      year: MOCK_YEAR,
      stageNum: MOCK_STAGE,
      connection: 'connected',
      millesime: mockMillesime,
      stages: mockStage,
      stageSingle: mockStage,
      teams: mockTeams,
      competitors: mockCompetitors,
      checkpointDoc: mockCheckpoint,
      flashInfo: buildMockFlash(6, Date.now()),
      rankingTypes: mockRankings,
      rankingJerseys: mockJerseys,
      telemetryPack: [],
      telemetryCompetitor: [],
      lastUpdated: new Date().toISOString(),
      mock: true
    }

    if (this.events) {
      const step = buildMockEventStep(this.tick)
      return { ...base, rankingTypes: step.rankingTypes, telemetryPack: step.telemetryPack }
    }
    if (this.restDay) {
      return {
        ...base,
        stageNum: 10,
        stages: mockRestCalendar,
        stageSingle: [mockRestCalendar[1]],
        checkpointDoc: undefined,
        flashInfo: undefined,
        now: MOCK_REST_NOW
      }
    }
    if (this.timeTrial) {
      return {
        ...base,
        stageNum: MOCK_TT_STAGE,
        stages: mockStageTT,
        stageSingle: mockStageTT,
        flashInfo: buildMockFlash(4, Date.now()),
        telemetryCompetitor: buildMockCompetitor(this.tick)
      }
    }
    return {
      ...base,
      telemetryPack: buildMockTelemetry(this.tick),
      telemetryCompetitor: buildMockCompetitor(this.tick)
    }
  }

  private emit(): void {
    try {
      this.onState(this.getState())
    } catch {
      // ignore
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }
}
