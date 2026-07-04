import { useEffect, useState } from 'react'
import type { TeamDetail as TeamDetailType } from '@shared/types'
import { useRaceStore } from '../store/raceStore'
import { riderLabel } from '../format'
import { DetailShell, Field } from './DetailShell'
import { FollowButton } from './FollowButton'

export function TeamDetail({ id }: { id: string }): React.JSX.Element {
  const openRider = useRaceStore((s) => s.openRider)
  const [team, setTeam] = useState<TeamDetailType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    void window.tdf?.requestTeam(id).then((t) => {
      if (active) {
        setTeam(t)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <DetailShell title="Team"><p className="px-1 py-4 text-sm text-white/40">Loading…</p></DetailShell>

  if (!team) {
    return (
      <DetailShell title="Team">
        <p className="px-1 py-4 text-sm text-white/50">Team details aren&apos;t available.</p>
      </DetailShell>
    )
  }

  return (
    <DetailShell title={team.name ?? team.code ?? 'Team'}>
      <div className="flex items-center gap-3">
        <div
          className="h-12 w-2 rounded-full ring-1 ring-black/30"
          style={{ background: team.color ?? '#666' }}
        />
        {team.logo && <TeamLogo src={team.logo} alt={team.name ?? 'team'} />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold leading-tight">{team.name}</div>
          {team.nationality && (
            <div className="text-sm text-white/60">{team.nationality.toUpperCase()}</div>
          )}
        </div>
        <FollowButton kind="team" id={team.id} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {team.code && <Field label="Code" value={team.code} />}
        <Field label="Riders" value={`${team.riders.length}`} />
      </div>

      <div className="mt-4">
        <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Roster
        </h3>
        {team.riders.length === 0 ? (
          <p className="px-1 text-xs text-white/40">No roster available yet.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {team.riders.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => openRider(r.id)}
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-xs odd:bg-white/[0.03] hover:bg-white/10"
                >
                  {r.bib !== undefined && (
                    <span className="w-6 text-right font-mono text-white/40">{r.bib}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-left text-white/85">
                    {riderLabel(r)}
                  </span>
                  {r.nationality && (
                    <span className="font-mono text-[10px] text-white/40">
                      {r.nationality.toUpperCase()}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DetailShell>
  )
}

function TeamLogo({ src, alt }: { src: string; alt: string }): React.JSX.Element | null {
  const [errored, setErrored] = useState(false)
  if (errored) return null
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className="h-10 w-10 shrink-0 rounded bg-white/10 object-contain p-0.5"
    />
  )
}
