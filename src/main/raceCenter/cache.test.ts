import { describe, expect, it } from 'vitest'
import { RaceCache } from './cache'

describe('RaceCache', () => {
  it('stores and reads a full response', () => {
    const c = new RaceCache()
    c.setFull('team-2025', [{ _id: 'a' }, { _id: 'b' }], 1000)
    expect(c.has('team-2025')).toBe(true)
    expect(c.getRecords('team-2025')).toHaveLength(2)
    expect(c.getTimestamp('team-2025')).toBe(1000)
  })

  it('derives timestamp from _updatedAt when none provided', () => {
    const c = new RaceCache()
    c.setFull('x', [{ _id: 'a', _updatedAt: 500 }, { _id: 'b', _updatedAt: 900 }])
    expect(c.getTimestamp('x')).toBe(900)
  })

  it('merges incremental records by _id (replace + append)', () => {
    const c = new RaceCache()
    c.setFull('x', [{ _id: 'a', v: 1 }, { _id: 'b', v: 1 }], 100)
    c.mergeIncremental('x', [{ _id: 'b', v: 2 }, { _id: 'c', v: 1 }], 200)
    const recs = c.getRecords<{ _id: string; v: number }>('x')
    expect(recs).toHaveLength(3)
    expect(recs.find((r) => r._id === 'b')?.v).toBe(2)
    expect(recs.find((r) => r._id === 'c')?.v).toBe(1)
    expect(c.getTimestamp('x')).toBe(200)
  })

  it('treats id-less payloads as a full replacement', () => {
    const c = new RaceCache()
    c.setFull('pack', [{ groups: [1] }], 100)
    c.mergeIncremental('pack', [{ groups: [2, 3] }], 200)
    const recs = c.getRecords<{ groups: number[] }>('pack')
    expect(recs).toHaveLength(1)
    expect(recs[0].groups).toEqual([2, 3])
  })

  it('mergeIncremental with no existing bind behaves like setFull', () => {
    const c = new RaceCache()
    c.mergeIncremental('y', [{ _id: 'a' }], 50)
    expect(c.getRecords('y')).toHaveLength(1)
  })

  it('empty incremental only bumps timestamp', () => {
    const c = new RaceCache()
    c.setFull('x', [{ _id: 'a' }], 100)
    c.mergeIncremental('x', [], 300)
    expect(c.getRecords('x')).toHaveLength(1)
    expect(c.getTimestamp('x')).toBe(300)
  })

  it('snapshots and reloads', () => {
    const c = new RaceCache()
    c.setFull('x', [{ _id: 'a' }], 100)
    const snap = c.snapshot()
    const c2 = new RaceCache()
    c2.loadSnapshot(snap)
    expect(c2.getRecords('x')).toHaveLength(1)
    expect(c2.getTimestamp('x')).toBe(100)
  })
})
