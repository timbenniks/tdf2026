'use client'

import { useEffect } from 'react'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { useRaceStore } from '@/store/raceStore'

function timeAgo(ms?: number): string {
  if (!ms) return '—'
  const sec = Math.floor((Date.now() - ms) / 1000)
  if (sec < 5) return 'just now'
  if (sec < 60) return `${sec}s ago`
  return `${Math.floor(sec / 60)}m ago`
}

function formatGap(seconds?: number): string {
  if (seconds === undefined || seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`
}

export function Dashboard(): React.JSX.Element {
  const state = useRaceStore((s) => s.state)
  const receivedAt = useRaceStore((s) => s.receivedAt)
  const refresh = useRaceStore((s) => s.refresh)
  const reconnect = useRaceStore((s) => s.reconnect)
  const init = useRaceStore((s) => s.init)

  useEffect(() => init(), [init])

  const stage = state.stage

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Tour de France</h1>
            <p className="text-sm text-white/50">
              Stage {state.stageNum ?? '—'} · {state.year}
              {state.mock && (
                <span className="ml-2 rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-fuchsia-300">
                  mock
                </span>
              )}
            </p>
          </div>
          {state.isLive && (
            <span className="flex items-center gap-1 rounded bg-red-500/20 px-2 py-1 text-[10px] font-semibold uppercase text-red-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              live
            </span>
          )}
        </div>
        {stage && (
          <p className="mt-2 text-sm text-white/70">
            {stage.departureCity} → {stage.arrivalCity}
            {stage.lengthKm !== undefined && (
              <span className="text-white/40"> · {stage.lengthKm} km</span>
            )}
          </p>
        )}
      </header>

      <main className="flex-1 space-y-4 px-4 py-4">
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Groups
          </h2>
          <ul className="space-y-2">
            {state.groups.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
              >
                <div>
                  <span className="font-medium">{g.name}</span>
                  {g.size !== undefined && (
                    <span className="ml-2 text-xs text-white/40">{g.size} riders</span>
                  )}
                </div>
                <span className="font-mono text-sm text-yellow-300">
                  {g.gapToLeaderSeconds ? formatGap(g.gapToLeaderSeconds) : 'lead'}
                </span>
              </li>
            ))}
            {state.groups.length === 0 && (
              <li className="text-sm text-white/40">No groups yet.</li>
            )}
          </ul>
        </section>

        {state.commentary[0] && (
          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
              Commentary
            </h2>
            <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/80">
              {state.commentary[0].text}
            </p>
          </section>
        )}

        <p className="text-[11px] text-white/30">
          API via Launch Edge Functions · Phase 1 scaffold
        </p>
      </main>

      <ConnectionStatus
        connection={state.connection}
        lastUpdatedLabel={timeAgo(receivedAt)}
        error={state.error}
        onRefresh={refresh}
        onReconnect={reconnect}
      />
    </div>
  )
}
