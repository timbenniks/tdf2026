import type { LiveRaceState, RaceGroup } from '@shared/types'

const PELOTON_HINTS = ['peloton', 'main', 'bunch', 'gruppo', 'group maillot']

/** Format a duration in seconds as a compact clock: "1:24" or "1:02:03". */
export function formatSeconds(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return ''
  const total = Math.round(Math.abs(seconds))
  if (total === 0) return '0:00'
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`
  return `${m}:${ss}`
}

/** Format a distance in km compactly: "47km", "112km", "3.4km". */
export function formatDistance(km?: number): string {
  if (km === undefined || !Number.isFinite(km) || km < 0) return ''
  if (km >= 10) return `${Math.round(km)}km`
  return `${km.toFixed(1)}km`
}

/**
 * Find the peloton. Heuristic: a group whose name matches a peloton hint, else the
 * largest group, else the last group in order.
 */
export function findPeloton(groups: RaceGroup[]): RaceGroup | undefined {
  if (groups.length === 0) return undefined
  const named = groups.find((g) => {
    const n = g.name?.toLowerCase() ?? ''
    return PELOTON_HINTS.some((h) => n.includes(h))
  })
  if (named) return named

  let largest = groups[0]
  for (const g of groups) {
    const size = g.size ?? g.bibs.length
    const best = largest.size ?? largest.bibs.length
    if (size > best) largest = g
  }
  // Only treat the largest as peloton if it's meaningfully big; otherwise last group.
  const largestSize = largest.size ?? largest.bibs.length
  if (largestSize >= 10) return largest
  return [...groups].sort((a, b) => a.order - b.order)[groups.length - 1]
}

/**
 * Find the lead group. Groups arrive ordered leader-first; prefer the most completed
 * distance, then least remaining, then lowest order.
 */
export function findLeadGroup(groups: RaceGroup[]): RaceGroup | undefined {
  if (groups.length === 0) return undefined
  return [...groups].sort((a, b) => {
    const ca = a.completedDistanceKm
    const cb = b.completedDistanceKm
    if (ca !== undefined && cb !== undefined && ca !== cb) return cb - ca
    const ra = a.remainingDistanceKm
    const rb = b.remainingDistanceKm
    if (ra !== undefined && rb !== undefined && ra !== rb) return ra - rb
    return a.order - b.order
  })[0]
}

/** Count distinct groups ahead of the peloton (i.e. breakaway/chase groups). */
function groupsAheadOfPeloton(groups: RaceGroup[], peloton?: RaceGroup): number {
  if (!peloton) return 0
  return groups.filter((g) => g.id !== peloton.id && g.order < peloton.order).length
}

/** Compact trend glyph for the menu-bar title (peloton closing on the break = ▼). */
function trendGlyph(trend?: RaceGroup['gapTrend']): string {
  if (trend === 'in') return '▼'
  if (trend === 'out') return '▲'
  return ''
}

/** Remaining distance for the tray: metres under 1 km, otherwise km. */
function formatRemaining(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  if (km >= 10) return `${Math.round(km)}km`
  return `${km.toFixed(1)}km`
}

/**
 * Compact menu-bar title. Examples: "TdF", "TdF …", "B ▼ +1:24", "B1 ▲ +1:24",
 * "FR 847m", "47km", "Live".
 */
export function formatTrayTitle(state: LiveRaceState): string {
  const reconnecting = state.connection === 'reconnecting' || state.connection === 'loading'
  const suffix = reconnecting ? ' …' : ''

  const groups = state.groups ?? []
  if (groups.length === 0) {
    return `TdF${suffix}`
  }

  const lead = findLeadGroup(groups)
  const peloton = findPeloton(groups)
  const ref = lead ?? peloton

  // Flamme rouge — final kilometre.
  const remaining = ref?.remainingDistanceKm
  if (remaining !== undefined && remaining > 0 && remaining <= 1) {
    return `FR ${formatRemaining(remaining)}${suffix}`
  }

  // Breakaway ahead of the peloton with a measurable gap.
  if (lead && peloton && lead.id !== peloton.id) {
    const ahead = groupsAheadOfPeloton(groups, peloton)
    const label = ahead > 1 ? 'B1' : 'B'
    const gapSeconds = peloton.gapToLeaderSeconds ?? lead.gapToPreviousSeconds
    const trend = trendGlyph(peloton.gapTrend)
    if (gapSeconds && gapSeconds > 0) {
      const trendPart = trend ? `${trend} ` : ''
      return `${label} ${trendPart}+${formatSeconds(gapSeconds)}${suffix}`
    }
    // No usable gap — fall back to remaining distance.
    const dist = formatDistance(lead.remainingDistanceKm ?? peloton.remainingDistanceKm)
    if (dist) return `${dist}${suffix}`
    return `${label}${suffix}`
  }

  // All together (or single group): show remaining distance, else "Live".
  const dist = formatDistance(ref?.remainingDistanceKm)
  if (dist) return `${dist}${suffix}`
  return `Live${suffix}`
}
