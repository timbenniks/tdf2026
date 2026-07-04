import type { RoutePoint, StageInfo } from '@shared/types'

export type ClimbPoint = {
  km: number
  name?: string
  altitude?: number
  gradient?: number
  lengthKm?: number
  /** Category code: HC / 1 / 2 / 3 / 4 / X (uncategorized côte). */
  category: string
}

export type KeyPointKind = 'start' | 'finish' | 'sprint' | 'feed'

export type KeyPoint = {
  km: number
  kind: KeyPointKind
  label?: string
  /** Sprint ordinal, e.g. "2" for the second intermediate sprint. */
  number?: string
}

export type StageProfile = {
  totalKm: number
  maxAltitude?: number
  climbs: ClimbPoint[]
  keyPoints: KeyPoint[]
  /** Altitude silhouette samples, sorted by km. Empty when no altitude is known. */
  samples: { km: number; alt: number }[]
}

function isClimb(p: RoutePoint): boolean {
  return p.summitAltitude !== undefined || p.summitCategory !== undefined
}

/**
 * Derive a stage profile (climbs, key points, altitude silhouette) from the
 * normalized route. Altitude is only known at categorized summits, so the
 * silhouette is a schematic built from start/summits/finish — honest about what
 * the API actually provides rather than a fabricated dense track.
 */
export function buildStageProfile(route: RoutePoint[], stage?: StageInfo): StageProfile {
  const withKm = route.filter((p) => typeof p.lengthKm === 'number')
  const lastKm = withKm.length ? (withKm[withKm.length - 1].lengthKm as number) : 0
  const totalKm = stage?.lengthKm && stage.lengthKm > 0 ? stage.lengthKm : lastKm

  const climbs: ClimbPoint[] = []
  const keyPoints: KeyPoint[] = []

  for (const p of route) {
    const km = p.lengthKm
    if (isClimb(p)) {
      climbs.push({
        km: km ?? 0,
        name: p.summitName ?? p.name,
        altitude: p.summitAltitude,
        gradient: p.summitGradient,
        lengthKm: undefined,
        category: p.summitCategory ?? 'X'
      })
    }
    if (p.types.includes('C')) {
      keyPoints.push({ km: km ?? 0, kind: 'sprint', label: p.name })
    }
    if (p.types.includes('N')) {
      keyPoints.push({ km: km ?? 0, kind: 'feed', label: p.name })
    }
    if (p.types.includes('R')) {
      keyPoints.push({ km: 0, kind: 'start', label: p.name })
    }
    if (p.types.includes('A')) {
      keyPoints.push({ km: totalKm, kind: 'finish', label: p.name })
    }
  }

  // Guarantee start/finish caps even if the checkpoint flags are missing.
  if (!keyPoints.some((k) => k.kind === 'start')) {
    keyPoints.unshift({ km: 0, kind: 'start', label: stage?.departureCity })
  }
  if (!keyPoints.some((k) => k.kind === 'finish')) {
    keyPoints.push({ km: totalKm, kind: 'finish', label: stage?.arrivalCity })
  }

  climbs.sort((a, b) => a.km - b.km)

  // Altitude silhouette: only meaningful when we have at least one summit.
  const summitSamples = climbs
    .filter((c) => typeof c.altitude === 'number')
    .map((c) => ({ km: c.km, alt: c.altitude as number }))

  let samples: { km: number; alt: number }[] = []
  let maxAltitude: number | undefined
  if (summitSamples.length > 0) {
    maxAltitude = Math.max(...summitSamples.map((s) => s.alt))
    // Baseline at the start/finish so the peaks read as climbs over flat ground.
    const baseline = Math.max(0, Math.min(...summitSamples.map((s) => s.alt)) - maxAltitude * 0.25)
    samples = [
      { km: 0, alt: baseline },
      ...summitSamples,
      { km: totalKm, alt: baseline }
    ].sort((a, b) => a.km - b.km)
  }

  return { totalKm, maxAltitude, climbs, keyPoints, samples }
}

/** Current distance covered, derived from the lead group, clamped to [0, total]. */
export function progressKm(
  totalKm: number,
  lead?: { remainingDistanceKm?: number; completedDistanceKm?: number }
): number | undefined {
  if (!lead) return undefined
  let km: number | undefined
  if (typeof lead.completedDistanceKm === 'number') km = lead.completedDistanceKm
  else if (typeof lead.remainingDistanceKm === 'number') km = totalKm - lead.remainingDistanceKm
  if (km === undefined || Number.isNaN(km)) return undefined
  return Math.max(0, Math.min(totalKm, km))
}

/** Lat/lon along the route at a given race distance (km), linearly interpolated. */
export function positionAtKm(
  route: RoutePoint[],
  km: number
): { latitude: number; longitude: number } | undefined {
  const withKm = route.filter((p) => typeof p.lengthKm === 'number')
  if (withKm.length === 0) return undefined
  if (withKm.length === 1) {
    return { latitude: withKm[0].latitude, longitude: withKm[0].longitude }
  }

  const firstKm = withKm[0].lengthKm as number
  if (km <= firstKm) {
    return { latitude: withKm[0].latitude, longitude: withKm[0].longitude }
  }

  for (let i = 1; i < withKm.length; i++) {
    const prev = withKm[i - 1]
    const curr = withKm[i]
    const k0 = prev.lengthKm as number
    const k1 = curr.lengthKm as number
    if (km > k1) continue
    const t = k1 === k0 ? 0 : (km - k0) / (k1 - k0)
    return {
      latitude: prev.latitude + t * (curr.latitude - prev.latitude),
      longitude: prev.longitude + t * (curr.longitude - prev.longitude)
    }
  }

  const last = withKm[withKm.length - 1]
  return { latitude: last.latitude, longitude: last.longitude }
}

/** Polyline segment color from the upcoming checkpoint's climb category. */
export function routeSegmentColor(point: RoutePoint): string {
  const cat = point.summitCategory
  if (!cat) return '#f5d300'
  if (cat === 'HC' || cat === '1') return '#e2001a'
  if (cat === '2') return '#f97316'
  if (cat === '3') return '#fbbf24'
  if (cat === '4' || cat === 'X') return '#22c55e'
  return '#f5d300'
}
