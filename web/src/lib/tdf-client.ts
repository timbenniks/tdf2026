import type { ExposedApi, LiveRaceState, RiderDetail, StageResults, TeamDetail } from '@shared/types'

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json() as Promise<T>
}

/** Browser client — same contract as Electron preload (`window.tdf`). */
export function createTdfClient(base = ''): ExposedApi {
  const prefix = base.replace(/\/$/, '')

  return {
    onStateUpdate(cb) {
      // Phase 4: EventSource to /api/state/stream. Poll until then.
      let stopped = false
      const poll = async (): Promise<void> => {
        if (stopped) return
        try {
          const state = await getJson<LiveRaceState>(`${prefix}/api/state`)
          cb(state)
        } catch {
          // keep polling
        }
        if (!stopped) setTimeout(poll, 30_000)
      }
      void poll()
      return () => {
        stopped = true
      }
    },

    requestState() {
      return getJson<LiveRaceState>(`${prefix}/api/state`)
    },

    refresh() {
      void getJson<LiveRaceState>(`${prefix}/api/refresh`, { method: 'POST' })
    },

    reconnect() {
      void getJson<LiveRaceState>(`${prefix}/api/reconnect`, { method: 'POST' })
    },

    requestRider(_id: string) {
      return Promise.resolve(null as RiderDetail | null)
    },

    requestTeam(_id: string) {
      return Promise.resolve(null as TeamDetail | null)
    },

    requestStageResults(_year: number, _stageNum: number) {
      return Promise.resolve(null as StageResults | null)
    }
  }
}
