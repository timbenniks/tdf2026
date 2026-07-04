import { create } from 'zustand'
import { DEFAULT_YEAR } from '@shared/config'
import { createEmptyState, type LiveRaceState } from '@shared/types'

export type View =
  | { name: 'main' }
  | { name: 'rider'; id: string }
  | { name: 'team'; id: string }
  | { name: 'schedule' }
  | { name: 'stageResults'; year: number; stage: number }

type Follows = { riders: string[]; teams: string[] }

const FOLLOWS_KEY = 'tdf.follows'

function loadFollows(): Follows {
  try {
    const raw = localStorage.getItem(FOLLOWS_KEY)
    if (!raw) return { riders: [], teams: [] }
    const parsed = JSON.parse(raw) as Partial<Follows>
    return {
      riders: Array.isArray(parsed.riders) ? parsed.riders : [],
      teams: Array.isArray(parsed.teams) ? parsed.teams : []
    }
  } catch {
    return { riders: [], teams: [] }
  }
}

function saveFollows(f: Follows): void {
  try {
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify(f))
  } catch {
    // localStorage may be unavailable; following is best-effort.
  }
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

type RaceStore = {
  state: LiveRaceState
  /** Wall-clock time (ms) the renderer last received a state push. */
  receivedAt?: number
  view: View
  follows: Follows
  setState: (state: LiveRaceState) => void
  refresh: () => void
  reconnect: () => void
  openRider: (id: string) => void
  openTeam: (id: string) => void
  openSchedule: () => void
  openStageResults: (year: number, stage: number) => void
  goHome: () => void
  toggleFollowRider: (id: string) => void
  toggleFollowTeam: (id: string) => void
  init: () => () => void
}

export const useRaceStore = create<RaceStore>((set, get) => ({
  state: createEmptyState(DEFAULT_YEAR),
  receivedAt: undefined,
  view: { name: 'main' },
  follows: loadFollows(),

  setState: (state) => set({ state, receivedAt: Date.now() }),

  refresh: () => window.tdf?.refresh(),
  reconnect: () => window.tdf?.reconnect(),

  openRider: (id) => set({ view: { name: 'rider', id } }),
  openTeam: (id) => set({ view: { name: 'team', id } }),
  openSchedule: () => set({ view: { name: 'schedule' } }),
  openStageResults: (year, stage) => set({ view: { name: 'stageResults', year, stage } }),
  goHome: () => set({ view: { name: 'main' } }),

  toggleFollowRider: (id) => {
    const follows = { ...get().follows, riders: toggle(get().follows.riders, id) }
    saveFollows(follows)
    set({ follows })
  },
  toggleFollowTeam: (id) => {
    const follows = { ...get().follows, teams: toggle(get().follows.teams, id) }
    saveFollows(follows)
    set({ follows })
  },

  init: () => {
    const api = window.tdf
    if (!api) return () => {}
    const unsubscribe = api.onStateUpdate((state) => set({ state, receivedAt: Date.now() }))
    void api.requestState().then((state) => set({ state, receivedAt: Date.now() }))
    return unsubscribe
  }
}))
