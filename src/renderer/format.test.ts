import { describe, expect, it } from 'vitest'
import { formatCountdown, stageStartIso } from './format'

describe('stageStartIso', () => {
  it('combines the stage date with the start time, keeping the offset', () => {
    expect(stageStartIso({ date: '2026-07-14T00:00:00+02:00', startTime: '13:25:00' })).toBe(
      '2026-07-14T13:25:00+02:00'
    )
  })
  it('handles a Z offset', () => {
    expect(stageStartIso({ date: '2026-07-14T00:00:00Z', startTime: '09:00:00' })).toBe(
      '2026-07-14T09:00:00Z'
    )
  })
  it('falls back to the raw date when no start time', () => {
    expect(stageStartIso({ date: '2026-07-14T00:00:00+02:00' })).toBe('2026-07-14T00:00:00+02:00')
  })
  it('returns undefined without a date', () => {
    expect(stageStartIso(undefined)).toBeUndefined()
    expect(stageStartIso({ startTime: '10:00:00' })).toBeUndefined()
  })
})

describe('formatCountdown', () => {
  it('formats multi-day spans', () => {
    expect(formatCountdown((26 * 3600 + 5 * 60) * 1000)).toBe('1d 2h 5m')
  })
  it('formats hour spans as H:MM:SS', () => {
    expect(formatCountdown((3600 + 5 * 60 + 9) * 1000)).toBe('1:05:09')
  })
  it('formats sub-hour spans as M:SS', () => {
    expect(formatCountdown((4 * 60 + 31) * 1000)).toBe('4:31')
  })
  it('clamps negatives to zero', () => {
    expect(formatCountdown(-5000)).toBe('0:00')
  })
})
