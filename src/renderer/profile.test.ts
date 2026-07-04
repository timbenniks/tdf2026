import { describe, expect, it } from 'vitest'
import { buildStageProfile, positionAtKm, progressKm, routeSegmentColor } from './profile'
import type { RoutePoint, StageInfo } from '@shared/types'

function pt(p: Partial<RoutePoint> & { index: number }): RoutePoint {
  return { latitude: 0, longitude: 0, types: [], ...p }
}

const stage: StageInfo = { year: 2026, stageNum: 12, lengthKm: 180, arrivalCity: 'Top', departureCity: 'Bottom' }

describe('buildStageProfile', () => {
  it('uses the stage length as total distance', () => {
    const route = [pt({ index: 0, lengthKm: 0, types: ['R'] }), pt({ index: 1, lengthKm: 150 })]
    const p = buildStageProfile(route, stage)
    expect(p.totalKm).toBe(180)
  })

  it('falls back to the last route km without a stage length', () => {
    const route = [pt({ index: 0, lengthKm: 0 }), pt({ index: 1, lengthKm: 95 })]
    const p = buildStageProfile(route, undefined)
    expect(p.totalKm).toBe(95)
  })

  it('extracts categorized climbs sorted by distance', () => {
    const route = [
      pt({ index: 0, lengthKm: 120, summitName: 'Col B', summitAltitude: 1800, summitCategory: '1', summitGradient: 8 }),
      pt({ index: 1, lengthKm: 40, summitName: 'Col A', summitAltitude: 900, summitCategory: '3' })
    ]
    const p = buildStageProfile(route, stage)
    expect(p.climbs.map((c) => c.name)).toEqual(['Col A', 'Col B'])
    expect(p.climbs[1].category).toBe('1')
    expect(p.maxAltitude).toBe(1800)
  })

  it('builds an altitude silhouette only when summits exist', () => {
    const flat = buildStageProfile([pt({ index: 0, lengthKm: 0 }), pt({ index: 1, lengthKm: 50 })], stage)
    expect(flat.samples).toEqual([])
    expect(flat.maxAltitude).toBeUndefined()

    const hilly = buildStageProfile(
      [pt({ index: 0, lengthKm: 90, summitAltitude: 1000, summitCategory: '2' })],
      stage
    )
    // baseline + summit + finish baseline
    expect(hilly.samples.length).toBe(3)
    expect(hilly.samples[0].km).toBe(0)
    expect(hilly.samples[hilly.samples.length - 1].km).toBe(180)
  })

  it('records sprints and synthesizes start/finish caps', () => {
    const route = [pt({ index: 0, lengthKm: 60, types: ['C'], name: 'Sprint town' })]
    const p = buildStageProfile(route, stage)
    expect(p.keyPoints.find((k) => k.kind === 'sprint')?.km).toBe(60)
    expect(p.keyPoints.find((k) => k.kind === 'start')?.km).toBe(0)
    expect(p.keyPoints.find((k) => k.kind === 'finish')?.km).toBe(180)
  })
})

describe('progressKm', () => {
  it('prefers completed distance', () => {
    expect(progressKm(180, { completedDistanceKm: 42 })).toBe(42)
  })

  it('derives from remaining distance', () => {
    expect(progressKm(180, { remainingDistanceKm: 30 })).toBe(150)
  })

  it('clamps to the stage bounds', () => {
    expect(progressKm(180, { completedDistanceKm: 999 })).toBe(180)
    expect(progressKm(180, { remainingDistanceKm: 999 })).toBe(0)
  })

  it('returns undefined without a lead group', () => {
    expect(progressKm(180, undefined)).toBeUndefined()
  })
})

describe('positionAtKm', () => {
  const route = [
    { index: 0, latitude: 46, longitude: 5, lengthKm: 0, types: [] },
    { index: 1, latitude: 46.5, longitude: 5.5, lengthKm: 50, types: [] },
    { index: 2, latitude: 47, longitude: 6, lengthKm: 100, types: [] }
  ]

  it('interpolates between checkpoints', () => {
    const pos = positionAtKm(route, 25)
    expect(pos?.latitude).toBeCloseTo(46.25)
    expect(pos?.longitude).toBeCloseTo(5.25)
  })

  it('returns the start before km 0', () => {
    const pos = positionAtKm(route, -5)
    expect(pos).toEqual({ latitude: 46, longitude: 5 })
  })
})

describe('routeSegmentColor', () => {
  it('maps climb categories to distinct colors', () => {
    expect(routeSegmentColor({ index: 0, latitude: 0, longitude: 0, types: [], summitCategory: 'HC' })).toBe(
      '#e2001a'
    )
    expect(routeSegmentColor({ index: 0, latitude: 0, longitude: 0, types: [], summitCategory: '4' })).toBe(
      '#22c55e'
    )
    expect(routeSegmentColor({ index: 0, latitude: 0, longitude: 0, types: [] })).toBe('#f5d300')
  })
})
