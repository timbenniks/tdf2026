import { describe, expect, it, vi } from 'vitest'
import {
  RaceCenterClient,
  RaceCenterError,
  binds,
  detectCurrentStage,
  detectCurrentYear
} from './client'

function mockResponse(body: string, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: async () => body
  } as unknown as Response
}

describe('binds', () => {
  it('builds bind names', () => {
    expect(binds.team(2026)).toBe('team-2026')
    expect(binds.telemetryPack(2026, 3)).toBe('telemetryPack-2026-3')
    expect(binds.stageByNum(2025, 20)).toBe('stage-2025/20')
  })
})

describe('RaceCenterClient.buildUrl', () => {
  const c = new RaceCenterClient({ baseUrl: 'https://x.test' })
  it('builds plain and from URLs', () => {
    expect(c.buildUrl('team-2026')).toBe('https://x.test/api/team-2026')
    expect(c.buildUrl('team-2026', 123)).toBe('https://x.test/api/team-2026?from=123')
  })
})

describe('RaceCenterClient.getBind', () => {
  it('parses arrays', async () => {
    const fetchFn = vi.fn(async () => mockResponse('[{"_id":"a"}]'))
    const c = new RaceCenterClient({ fetchFn: fetchFn as unknown as typeof fetch })
    expect(await c.getBind('team-2026')).toEqual([{ _id: 'a' }])
  })

  it('wraps single objects into an array', async () => {
    const fetchFn = vi.fn(async () => mockResponse('{"_id":"a"}'))
    const c = new RaceCenterClient({ fetchFn: fetchFn as unknown as typeof fetch })
    expect(await c.getBind('event')).toEqual([{ _id: 'a' }])
  })

  it('returns [] for empty body', async () => {
    const fetchFn = vi.fn(async () => mockResponse('   '))
    const c = new RaceCenterClient({ fetchFn: fetchFn as unknown as typeof fetch })
    expect(await c.getBind('flashInfoLive-2026-1')).toEqual([])
  })

  it('throws on non-ok', async () => {
    const fetchFn = vi.fn(async () => mockResponse('nope', false, 500))
    const c = new RaceCenterClient({ fetchFn: fetchFn as unknown as typeof fetch })
    await expect(c.getBind('team-2026')).rejects.toBeInstanceOf(RaceCenterError)
  })

  it('throws on invalid JSON', async () => {
    const fetchFn = vi.fn(async () => mockResponse('{not json'))
    const c = new RaceCenterClient({ fetchFn: fetchFn as unknown as typeof fetch })
    await expect(c.getBind('team-2026')).rejects.toBeInstanceOf(RaceCenterError)
  })

  it('getBindSafe swallows errors', async () => {
    const fetchFn = vi.fn(async () => mockResponse('boom', false, 404))
    const c = new RaceCenterClient({ fetchFn: fetchFn as unknown as typeof fetch })
    expect(await c.getBindSafe('team-2026')).toEqual([])
  })
})

describe('detectCurrentYear', () => {
  it('prefers the live edition', () => {
    expect(
      detectCurrentYear([{ year: 2024 }, { year: 2025, isLive: true }, { year: 2026 }], 2026)
    ).toBe(2025)
  })
  it('falls back to preferred year when present', () => {
    expect(detectCurrentYear([{ year: 2024 }, { year: 2026 }], 2026)).toBe(2026)
  })
  it('falls back to latest year otherwise', () => {
    expect(detectCurrentYear([{ year: 2023 }, { year: 2024 }], 2026)).toBe(2024)
  })
  it('falls back to preferred when empty', () => {
    expect(detectCurrentYear([], 2026)).toBe(2026)
  })
})

describe('detectCurrentStage', () => {
  const stages = [
    { stage: 1, date: '2025-07-05T00:00:00+02:00' },
    { stage: 2, date: '2025-07-06T00:00:00+02:00' },
    { stage: 3, date: '2025-07-07T00:00:00+02:00' }
  ]

  it('picks the stage happening today', () => {
    expect(detectCurrentStage(stages, 1, new Date('2025-07-06T14:00:00+02:00'))).toBe(2)
  })
  it('picks the next upcoming stage before the race', () => {
    expect(detectCurrentStage(stages, 1, new Date('2025-07-01T00:00:00+02:00'))).toBe(1)
  })
  it('picks the last stage after the race', () => {
    expect(detectCurrentStage(stages, 1, new Date('2025-08-01T00:00:00+02:00'))).toBe(3)
  })
  it('falls back to preferred when no dates', () => {
    expect(detectCurrentStage([{ stage: undefined }], 7)).toBe(7)
  })
})
