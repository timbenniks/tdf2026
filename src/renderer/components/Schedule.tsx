import { useMemo } from 'react'
import type { LiveRaceState, StageInfo } from '@shared/types'
import { useRaceStore } from '../store/raceStore'
import { DetailShell } from './DetailShell'
import { SectionShell } from './Section'
import { formatDateLong } from '../format'

type NamedFollow = { id: string; name: string; teamColor?: string }

/** Resolve followed rider/team ids to display names from the current state. */
function resolveFollows(state: LiveRaceState, follows: { riders: string[]; teams: string[] }): {
  riders: NamedFollow[]
  teams: NamedFollow[]
} {
  const riderName = new Map<string, NamedFollow>()
  const teamName = new Map<string, NamedFollow>()
  for (const summary of state.rankings) {
    for (const e of summary.entries) {
      if (e.riderId && e.riderName && !riderName.has(e.riderId)) {
        riderName.set(e.riderId, { id: e.riderId, name: e.riderName, teamColor: e.teamColor })
      }
      if (e.teamId && e.teamName && !teamName.has(e.teamId)) {
        teamName.set(e.teamId, { id: e.teamId, name: e.teamName, teamColor: e.teamColor })
      }
    }
  }
  for (const g of state.groups) {
    for (const r of g.riders) {
      if (r.id && !riderName.has(r.id)) {
        const name = r.shortName ?? r.lastName ?? r.firstName
        if (name) riderName.set(r.id, { id: r.id, name, teamColor: r.teamColor })
      }
    }
  }
  return {
    riders: follows.riders.map((id) => riderName.get(id) ?? { id, name: 'Rider' }),
    teams: follows.teams.map((id) => teamName.get(id) ?? { id, name: 'Team' })
  }
}

function dayGap(a?: string, b?: string): number {
  if (!a || !b) return 1
  const da = Date.parse(a.slice(0, 10))
  const db = Date.parse(b.slice(0, 10))
  if (Number.isNaN(da) || Number.isNaN(db)) return 1
  return Math.round((db - da) / 86_400_000)
}

function StageRow({ stage, current }: { stage: StageInfo; current: boolean }): React.JSX.Element {
  const openStageResults = useRaceStore((s) => s.openStageResults)
  return (
    <button
      onClick={() => openStageResults(stage.year, stage.stageNum)}
      className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition hover:bg-white/10 ${
        current ? 'border-yellow-400/40 bg-yellow-400/10' : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 font-mono text-xs font-bold">
        {stage.stageNum}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-white/90">
            {stage.departureCity ?? '?'} → {stage.arrivalCity ?? '?'}
          </span>
          {current && (
            <span className="shrink-0 rounded bg-yellow-400/20 px-1 text-[9px] font-semibold uppercase text-yellow-200">
              today
            </span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 text-[10px] text-white/45">
          {formatDateLong(stage.date) && <span>{formatDateLong(stage.date)}</span>}
          {stage.typeLabel && <span>· {stage.typeLabel}</span>}
          {(stage.lengthDisplay || stage.lengthKm) && (
            <span>· {stage.lengthDisplay ?? `${stage.lengthKm} km`}</span>
          )}
        </span>
      </span>
      <span className="shrink-0 text-white/25">›</span>
    </button>
  )
}

export function Schedule(): React.JSX.Element {
  const state = useRaceStore((s) => s.state)
  const follows = useRaceStore((s) => s.follows)
  const openRider = useRaceStore((s) => s.openRider)
  const openTeam = useRaceStore((s) => s.openTeam)

  const named = useMemo(() => resolveFollows(state, follows), [state, follows])
  const hasFollows = named.riders.length > 0 || named.teams.length > 0

  return (
    <DetailShell title={`${state.year} schedule`}>
      {hasFollows && (
        <SectionShell title="Following">
          <div className="flex flex-wrap gap-1.5">
            {named.riders.map((r) => (
              <button
                key={`r-${r.id}`}
                onClick={() => openRider(r.id)}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20"
              >
                {r.teamColor && (
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.teamColor }} />
                )}
                {r.name}
              </button>
            ))}
            {named.teams.map((t) => (
              <button
                key={`t-${t.id}`}
                onClick={() => openTeam(t.id)}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20"
              >
                {t.teamColor && (
                  <span className="h-2.5 w-1 rounded-sm" style={{ background: t.teamColor }} />
                )}
                {t.name}
              </button>
            ))}
          </div>
        </SectionShell>
      )}

      <SectionShell title="Stages">
        {state.schedule.length === 0 ? (
          <p className="px-1 text-xs text-white/40">Calendar not loaded yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {state.schedule.map((stage, i) => {
              const prev = state.schedule[i - 1]
              const gap = dayGap(prev?.date, stage.date)
              return (
                <div key={stage.stageNum} className="flex flex-col gap-1.5">
                  {gap > 1 && (
                    <div className="px-1 text-[10px] font-medium uppercase tracking-wide text-sky-300/60">
                      Rest day
                    </div>
                  )}
                  <StageRow stage={stage} current={stage.stageNum === state.stageNum} />
                </div>
              )
            })}
          </div>
        )}
      </SectionShell>
    </DetailShell>
  )
}
