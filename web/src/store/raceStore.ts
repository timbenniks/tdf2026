import { create } from 'zustand'
import { DEFAULT_YEAR } from '@shared/config'
import { createEmptyState, type LiveRaceState } from '@shared/types'
import { createTdfClient } from '@/lib/tdf-client'

type RaceStore = {
  state: LiveRaceState
  receivedAt?: number
  setState: (state: LiveRaceState) => void
  refresh: () => void
  reconnect: () => void
  init: () => () => void
}

export const useRaceStore = create<RaceStore>((set) => ({
  state: createEmptyState(DEFAULT_YEAR),
  receivedAt: undefined,

  setState: (state) => set({ state, receivedAt: Date.now() }),

  refresh: () => {
    void fetch('/api/refresh', { method: 'POST' })
      .then((r) => r.json())
      .then((state: LiveRaceState) => set({ state, receivedAt: Date.now() }))
  },
  reconnect: () => {
    void fetch('/api/reconnect', { method: 'POST' })
      .then((r) => r.json())
      .then((state: LiveRaceState) => set({ state, receivedAt: Date.now() }))
  },

  init: () => {
    const api = createTdfClient()
    const unsubscribe = api.onStateUpdate((state) => set({ state, receivedAt: Date.now() }))
    void api.requestState().then((state) => set({ state, receivedAt: Date.now() }))
    return unsubscribe
  }
}))
