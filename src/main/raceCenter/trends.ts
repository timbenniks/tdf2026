import type { LiveRaceState } from '@shared/types'

type Sample = { gap: number; t: number }

const STEADY_THRESHOLD_S = 2

/**
 * Annotates groups with a gap trend (closing / growing) and a signed rate in
 * seconds per minute, by remembering each group's previous gap. Stateful and
 * stage-scoped: the history resets when the stage changes. Mutates the state in
 * place so it can sit in the emit path for any provider.
 */
export class GapTrendTracker {
  private prev = new Map<string, Sample>()
  private stageKey?: string

  apply(state: LiveRaceState, now: number = Date.now()): void {
    const stageKey = `${state.year}-${state.stageNum ?? '?'}`
    if (stageKey !== this.stageKey) {
      this.prev.clear()
      this.stageKey = stageKey
    }

    const seen = new Set<string>()
    for (const group of state.groups) {
      const gap = group.gapToLeaderSeconds
      if (gap === undefined) continue
      seen.add(group.name)

      const last = this.prev.get(group.name)
      if (last) {
        const delta = gap - last.gap
        const dtMin = Math.max((now - last.t) / 60_000, 1 / 60)
        if (Math.abs(delta) < STEADY_THRESHOLD_S) {
          group.gapTrend = 'steady'
          group.gapTrendSecPerMin = 0
        } else {
          group.gapTrend = delta > 0 ? 'out' : 'in'
          group.gapTrendSecPerMin = Math.round(delta / dtMin)
        }
      }
      this.prev.set(group.name, { gap, t: now })
    }

    // Forget groups that no longer exist so names can't accumulate forever.
    for (const name of [...this.prev.keys()]) {
      if (!seen.has(name)) this.prev.delete(name)
    }
  }
}
