import { Notification } from 'electron'
import type { LiveRaceState } from '@shared/types'
import { detectRaceEvents, type RaceEvent } from './raceEvents'

const DEDUPE_WINDOW_MS = 60_000

/**
 * Watches the stream of race states and surfaces notable changes as native
 * notifications. Keeps the previous state internally and de-duplicates events so
 * a flapping signal can't spam the user.
 */
export class Notifier {
  enabled = true
  private prev?: LiveRaceState
  private recent = new Map<string, number>()

  handle(next: LiveRaceState): void {
    const prev = this.prev
    this.prev = next
    if (!prev) return // establish a baseline silently on first state
    if (!this.enabled) return
    for (const event of detectRaceEvents(prev, next)) this.show(event)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  private show(event: RaceEvent): void {
    const now = Date.now()
    const last = this.recent.get(event.key)
    if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return
    this.recent.set(event.key, now)
    this.prune(now)

    if (!Notification.isSupported()) return
    try {
      new Notification({ title: event.title, body: event.body, silent: false }).show()
    } catch {
      // Never let a notification failure disturb the data loop.
    }
  }

  private prune(now: number): void {
    for (const [key, ts] of this.recent) {
      if (now - ts > DEDUPE_WINDOW_MS) this.recent.delete(key)
    }
  }
}
