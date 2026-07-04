import { describe, expect, it } from 'vitest'
import { indexById, parseRef, resolveRef, resolveRefIndexed } from './refs'

describe('parseRef', () => {
  it('parses a well-formed ref', () => {
    expect(parseRef('team-2025:abc123')).toEqual({ bind: 'team-2025', id: 'abc123' })
  })

  it('parses refs whose id contains hex', () => {
    expect(parseRef('allCompetitors-2026:deadbeefcafe')).toEqual({
      bind: 'allCompetitors-2026',
      id: 'deadbeefcafe'
    })
  })

  it('returns null for empty / missing / malformed', () => {
    expect(parseRef(undefined)).toBeNull()
    expect(parseRef(null)).toBeNull()
    expect(parseRef('')).toBeNull()
    expect(parseRef('noColon')).toBeNull()
    expect(parseRef(':missingBind')).toBeNull()
    expect(parseRef('missingId:')).toBeNull()
  })
})

describe('resolveRef', () => {
  const collections = {
    'team-2025': [
      { _id: 'a', name: 'Team A' },
      { _id: 'b', name: 'Team B' }
    ]
  }

  it('resolves against the matching collection', () => {
    expect(resolveRef('team-2025:b', collections)?.name).toBe('Team B')
  })

  it('returns null when bind / id / collection missing', () => {
    expect(resolveRef('team-2025:zzz', collections)).toBeNull()
    expect(resolveRef('team-2099:a', collections)).toBeNull()
    expect(resolveRef(undefined, collections)).toBeNull()
  })
})

describe('indexById + resolveRefIndexed', () => {
  it('builds an index and resolves through it', () => {
    const idx = indexById([{ _id: 'x', v: 1 }, { _id: 'y', v: 2 }])
    expect(idx.size).toBe(2)
    const indexes = { 'team-2025': idx }
    expect(resolveRefIndexed('team-2025:y', indexes)?.v).toBe(2)
    expect(resolveRefIndexed('team-2025:nope', indexes)).toBeNull()
    expect(resolveRefIndexed('other:y', indexes)).toBeNull()
  })

  it('skips records without _id', () => {
    const idx = indexById([{ v: 1 }, { _id: 'y', v: 2 }] as { _id?: string; v: number }[])
    expect(idx.size).toBe(1)
  })
})
