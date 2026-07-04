import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export type BindCache = {
  bindName: string
  timestamp?: number
  records: unknown[]
}

type RecordWithId = { _id?: string; _updatedAt?: number | string }

function readUpdatedAt(record: unknown): number | undefined {
  if (record && typeof record === 'object' && '_updatedAt' in record) {
    const v = (record as RecordWithId)._updatedAt
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const t = Date.parse(v)
      return Number.isNaN(t) ? undefined : t
    }
  }
  return undefined
}

/**
 * In-memory cache keyed by bind name. Handles both full responses (replace) and
 * incremental `?from=` responses (merge by `_id`). Optionally persists a snapshot
 * to disk so the panel has data immediately after a restart.
 */
export class RaceCache {
  private store = new Map<string, BindCache>()
  private filePath?: string

  constructor(filePath?: string) {
    this.filePath = filePath
  }

  has(bindName: string): boolean {
    return this.store.has(bindName)
  }

  get(bindName: string): BindCache | undefined {
    return this.store.get(bindName)
  }

  getRecords<T = unknown>(bindName: string): T[] {
    return (this.store.get(bindName)?.records as T[]) ?? []
  }

  getTimestamp(bindName: string): number | undefined {
    return this.store.get(bindName)?.timestamp
  }

  /** Replace the full contents for a bind (initial / no-`from` fetch). */
  setFull(bindName: string, records: unknown[], timestamp?: number): void {
    const ts = timestamp ?? this.maxTimestamp(records)
    this.store.set(bindName, { bindName, records: [...records], timestamp: ts })
  }

  /**
   * Merge incremental records into an existing bind. Records are matched by `_id`:
   * existing entries are replaced, new ones appended. Records without `_id` (e.g.
   * singleton docs like telemetryPack) replace the whole array.
   */
  mergeIncremental(bindName: string, records: unknown[], timestamp?: number): void {
    const existing = this.store.get(bindName)
    if (!existing) {
      this.setFull(bindName, records, timestamp)
      return
    }
    if (records.length === 0) {
      if (timestamp !== undefined) existing.timestamp = Math.max(existing.timestamp ?? 0, timestamp)
      return
    }

    const allHaveId = records.every(
      (r) => r && typeof r === 'object' && typeof (r as RecordWithId)._id === 'string'
    )

    if (!allHaveId) {
      // Singleton-ish payloads (no stable id): treat as a full replacement.
      existing.records = [...records]
    } else {
      const byId = new Map<string, unknown>()
      for (const r of existing.records) {
        const id = (r as RecordWithId)?._id
        if (typeof id === 'string') byId.set(id, r)
      }
      for (const r of records) {
        const id = (r as RecordWithId)._id as string
        byId.set(id, r)
      }
      existing.records = [...byId.values()]
    }

    const incomingTs = timestamp ?? this.maxTimestamp(records)
    if (incomingTs !== undefined) {
      existing.timestamp = Math.max(existing.timestamp ?? 0, incomingTs)
    }
  }

  private maxTimestamp(records: unknown[]): number | undefined {
    let max: number | undefined
    for (const r of records) {
      const ts = readUpdatedAt(r)
      if (ts !== undefined) max = max === undefined ? ts : Math.max(max, ts)
    }
    return max
  }

  /** All bind names currently cached. */
  keys(): string[] {
    return [...this.store.keys()]
  }

  snapshot(): BindCache[] {
    return [...this.store.values()].map((b) => ({
      bindName: b.bindName,
      timestamp: b.timestamp,
      records: b.records
    }))
  }

  loadSnapshot(snapshot: BindCache[]): void {
    for (const b of snapshot) {
      if (b && typeof b.bindName === 'string' && Array.isArray(b.records)) {
        this.store.set(b.bindName, {
          bindName: b.bindName,
          timestamp: b.timestamp,
          records: b.records
        })
      }
    }
  }

  /** Load a previously persisted snapshot from disk (best-effort). */
  loadFromDisk(): boolean {
    if (!this.filePath || !existsSync(this.filePath)) return false
    try {
      const raw = readFileSync(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this.loadSnapshot(parsed)
        return true
      }
    } catch {
      // Corrupt cache file — ignore and start fresh.
    }
    return false
  }

  /** Persist the current snapshot to disk (best-effort). */
  saveToDisk(): void {
    if (!this.filePath) return
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      writeFileSync(this.filePath, JSON.stringify(this.snapshot()), 'utf-8')
    } catch {
      // Disk write failures must never crash the app.
    }
  }

  clear(): void {
    this.store.clear()
  }
}
