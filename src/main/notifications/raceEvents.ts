import type { LiveRaceState, RaceGroup } from '@shared/types'

export type RaceEventType =
  | 'stageStart'
  | 'stageFinish'
  | 'breakaway'
  | 'caught'
  | 'jersey'

export type RaceEvent = {
  type: RaceEventType
  /** Stable key for de-duplication (same key won't re-notify within a window). */
  key: string
  title: string
  body: string
}

/** Classification code -> jersey label, for jersey-change detection. */
const JERSEY_FROM_RANKING: Record<string, string> = {
  etg: 'Yellow jersey',
  icg: 'Green jersey',
  img: 'Polka-dot jersey',
  iqg: 'White jersey'
}

/** A stage is actually racing (vs. merely scheduled) when live data is flowing. */
export function isRacing(state: LiveRaceState): boolean {
  return state.raceStatus === true || state.groups.length > 0 || state.liveRiders.length > 0
}

function formatGapSec(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return ''
  const total = Math.round(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
}

/** The largest group is treated as the peloton/main bunch. */
function peloton(groups: RaceGroup[]): RaceGroup | undefined {
  if (groups.length === 0) return undefined
  return [...groups].sort((a, b) => (b.size ?? b.bibs.length) - (a.size ?? a.bibs.length))[0]
}

type Holder = { key: string; name: string }

/** Position-1 rider of each jersey classification, keyed for stable comparison. */
export function jerseyHolders(state: LiveRaceState): Map<string, Holder> {
  const out = new Map<string, Holder>()
  for (const code of Object.keys(JERSEY_FROM_RANKING)) {
    const summary = state.rankings.find((r) => r.type === code)
    const top = summary?.entries.find((e) => e.position === 1)
    if (!top) continue
    const key = top.riderId ?? (top.bib !== undefined ? `bib-${top.bib}` : top.riderName ?? '')
    const name = top.riderName ?? (top.bib !== undefined ? `#${top.bib}` : '')
    if (key && name) out.set(code, { key, name })
  }
  return out
}

function stageLabel(state: LiveRaceState): string {
  return state.stage?.stageNum ? `Stage ${state.stage.stageNum}` : 'Stage'
}

function cities(state: LiveRaceState): string {
  const d = state.stage?.departureCity
  const a = state.stage?.arrivalCity
  return d && a ? `${d} → ${a}` : (a ?? d ?? '')
}

/**
 * Diff two consecutive race states and return notable events. Pure and
 * side-effect free so it can be unit-tested; the notifier handles throttling.
 */
export function detectRaceEvents(prev: LiveRaceState, next: LiveRaceState): RaceEvent[] {
  const events: RaceEvent[] = []
  const stageNum = next.stage?.stageNum ?? next.stageNum ?? 0
  const wasRacing = isRacing(prev)
  const nowRacing = isRacing(next)

  if (!wasRacing && nowRacing) {
    events.push({
      type: 'stageStart',
      key: `start-${stageNum}`,
      title: `${stageLabel(next)} is under way`,
      body: cities(next) || 'The race has started.'
    })
  }

  if (wasRacing && !nowRacing) {
    const winner = next.rankings.find((r) => r.type === 'ete')?.entries.find((e) => e.position === 1)
    events.push({
      type: 'stageFinish',
      key: `finish-${stageNum}`,
      title: `${stageLabel(next)} finished`,
      body: winner?.riderName ? `Winner: ${winner.riderName}` : (cities(next) || 'Stage complete.')
    })
  }

  // Group structure changes (only meaningful for mass-start stages).
  const showGroups = next.stage?.showGroups !== false
  if (showGroups) {
    const prevMulti = prev.groups.length >= 2
    const nextMulti = next.groups.length >= 2
    if (!prevMulti && nextMulti) {
      const lead = next.groups[0]
      const gap = formatGapSec(peloton(next.groups)?.gapToLeaderSeconds)
      const riders = lead?.size ?? lead?.bibs.length ?? 0
      events.push({
        type: 'breakaway',
        key: `break-${stageNum}`,
        title: 'Breakaway clear',
        body: `${lead?.name ?? 'Lead group'}${riders ? ` (${riders})` : ''}${gap ? ` — lead ${gap}` : ''}`
      })
    }
    if (prevMulti && !nextMulti && nowRacing) {
      events.push({
        type: 'caught',
        key: `caught-${stageNum}`,
        title: 'Breakaway caught',
        body: 'The peloton is back together.'
      })
    }
  }

  // Jersey changes (leader of each classification).
  const before = jerseyHolders(prev)
  const after = jerseyHolders(next)
  for (const [code, label] of Object.entries(JERSEY_FROM_RANKING)) {
    const a = after.get(code)
    const b = before.get(code)
    if (a && b && a.key !== b.key) {
      events.push({
        type: 'jersey',
        key: `jersey-${code}-${a.key}`,
        title: label,
        body: `Now led by ${a.name}`
      })
    }
  }

  return events
}
