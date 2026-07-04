import { EventSource } from 'eventsource'
import { SSE_RECONNECT_MAX_MS, SSE_RECONNECT_MIN_MS, SSE_URL } from '@shared/config'

export type SseHandlers = {
  onUid?: (uid: string) => void
  onStage?: (stageHash: string) => void
  onGroups?: (groups: Record<string, number>) => void
  onMessage?: (data: string) => void
  onOpen?: () => void
  /** Fired when the server signals `end`, or on a connection error, before reconnect. */
  onDisconnect?: (reason: 'end' | 'error') => void
  onReconnectScheduled?: (delayMs: number) => void
}

/**
 * Wraps the Race Center `/live-stream` SSE endpoint with resilient reconnect.
 *
 * Named events handled: `uid`, `stage`, `groups`, `message`, `end`. The server may
 * also drop the connection, in which case we reconnect with exponential backoff.
 */
export class RaceSseClient {
  private url: string
  private handlers: SseHandlers
  private es?: EventSource
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private attempt = 0
  private closed = false

  constructor(handlers: SseHandlers, url: string = SSE_URL) {
    this.handlers = handlers
    this.url = url
  }

  connect(): void {
    this.closed = false
    this.cleanupSource()
    let es: EventSource
    try {
      es = new EventSource(this.url)
    } catch (err) {
      this.handlers.onDisconnect?.('error')
      this.scheduleReconnect()
      return
    }
    this.es = es

    es.onopen = () => {
      this.attempt = 0
      this.handlers.onOpen?.()
    }

    es.onerror = () => {
      if (this.closed) return
      // The native client may auto-retry; we force a controlled reconnect so the
      // app can surface a 'reconnecting' state and reset backoff predictably.
      this.handlers.onDisconnect?.('error')
      this.scheduleReconnect()
    }

    es.addEventListener('uid', (e) => this.handlers.onUid?.(readData(e)))
    es.addEventListener('stage', (e) => this.handlers.onStage?.(readData(e)))
    es.addEventListener('message', (e) => this.handlers.onMessage?.(readData(e)))
    es.addEventListener('groups', (e) => {
      const parsed = safeParseGroups(readData(e))
      if (parsed) this.handlers.onGroups?.(parsed)
    })
    es.addEventListener('end', () => {
      this.handlers.onDisconnect?.('end')
      this.scheduleReconnect()
    })
  }

  /** Force an immediate reconnect (used by the renderer "reconnect" button). */
  reconnect(): void {
    this.attempt = 0
    this.clearTimer()
    this.connect()
  }

  close(): void {
    this.closed = true
    this.clearTimer()
    this.cleanupSource()
  }

  private scheduleReconnect(): void {
    if (this.closed) return
    this.cleanupSource()
    this.clearTimer()
    const delay = Math.min(
      SSE_RECONNECT_MIN_MS * 2 ** this.attempt,
      SSE_RECONNECT_MAX_MS
    )
    this.attempt += 1
    this.handlers.onReconnectScheduled?.(delay)
    this.reconnectTimer = setTimeout(() => {
      if (!this.closed) this.connect()
    }, delay)
  }

  private clearTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
  }

  private cleanupSource(): void {
    if (this.es) {
      try {
        this.es.close()
      } catch {
        // ignore
      }
      this.es = undefined
    }
  }
}

function readData(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const d = (e as { data: unknown }).data
    return typeof d === 'string' ? d : String(d ?? '')
  }
  return ''
}

/** Parse the `groups` payload (bindName -> last update ms). Tolerates junk. */
export function safeParseGroups(data: string): Record<string, number> | null {
  if (!data || !data.trim()) return null
  try {
    const parsed = JSON.parse(data)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed)) {
      const ts = typeof v === 'number' ? v : Number(v)
      if (Number.isFinite(ts)) out[k] = ts
    }
    return Object.keys(out).length > 0 ? out : null
  } catch {
    return null
  }
}
