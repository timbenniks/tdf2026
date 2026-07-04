import { describe, expect, it } from 'vitest'
import { safeParseGroups } from './sse'

describe('safeParseGroups', () => {
  it('parses a valid bind->timestamp map', () => {
    expect(safeParseGroups('{"team-2026":1782383123533,"telemetryPack-2026-1":1782383124000}')).toEqual({
      'team-2026': 1782383123533,
      'telemetryPack-2026-1': 1782383124000
    })
  })

  it('coerces numeric strings', () => {
    expect(safeParseGroups('{"x":"123"}')).toEqual({ x: 123 })
  })

  it('returns null for empty, junk, arrays, or non-numeric', () => {
    expect(safeParseGroups('')).toBeNull()
    expect(safeParseGroups('   ')).toBeNull()
    expect(safeParseGroups('not json')).toBeNull()
    expect(safeParseGroups('[1,2,3]')).toBeNull()
    expect(safeParseGroups('{"x":"abc"}')).toBeNull()
  })
})
