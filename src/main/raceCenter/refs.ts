import type { ParsedRef } from './types'

/**
 * Parse a Race Center reference string into its bind name and document id.
 *
 * Examples:
 *   "team-2025:abc123"            -> { bind: "team-2025", id: "abc123" }
 *   "allCompetitors-2026:deadbeef"-> { bind: "allCompetitors-2026", id: "deadbeef" }
 *
 * Returns null for empty/malformed refs.
 */
export function parseRef(ref: string | undefined | null): ParsedRef | null {
  if (!ref || typeof ref !== 'string') return null
  const idx = ref.indexOf(':')
  if (idx <= 0 || idx === ref.length - 1) return null
  const bind = ref.slice(0, idx).trim()
  const id = ref.slice(idx + 1).trim()
  if (!bind || !id) return null
  return { bind, id }
}

type WithId = { _id?: string }

/**
 * Resolve a reference against a map of collections keyed by bind name.
 * Matches the referenced document by `_id`.
 *
 * `collections` is keyed by bind name (e.g. "team-2025") so a single resolver can
 * span multiple seasons. Returns null when the ref is missing/unresolvable.
 */
export function resolveRef<T extends WithId>(
  ref: string | undefined,
  collections: Record<string, T[]>
): T | null {
  const parsed = parseRef(ref)
  if (!parsed) return null
  const collection = collections[parsed.bind]
  if (!collection || collection.length === 0) return null
  for (const item of collection) {
    if (item && item._id === parsed.id) return item
  }
  return null
}

/**
 * Build a fast id->record index for a collection, so repeated lookups during
 * normalization are O(1) instead of O(n).
 */
export function indexById<T extends WithId>(collection: T[] | undefined): Map<string, T> {
  const map = new Map<string, T>()
  if (!collection) return map
  for (const item of collection) {
    if (item && item._id) map.set(item._id, item)
  }
  return map
}

/** Resolve a ref using a prebuilt index keyed by bind name. */
export function resolveRefIndexed<T extends WithId>(
  ref: string | undefined,
  indexes: Record<string, Map<string, T>>
): T | null {
  const parsed = parseRef(ref)
  if (!parsed) return null
  const index = indexes[parsed.bind]
  if (!index) return null
  return index.get(parsed.id) ?? null
}
