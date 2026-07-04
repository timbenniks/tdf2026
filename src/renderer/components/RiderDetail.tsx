import { useEffect, useMemo, useState } from 'react'
import type { RiderDetail as RiderDetailType } from '@shared/types'
import { useRaceStore } from '../store/raceStore'
import { ageFromBirthdate, formatGap, riderLabel } from '../format'
import { DetailShell, Field, JerseyChip } from './DetailShell'
import { FollowButton } from './FollowButton'

export function RiderDetail({ id }: { id: string }): React.JSX.Element {
  const state = useRaceStore((s) => s.state)
  const openTeam = useRaceStore((s) => s.openTeam)
  const [rider, setRider] = useState<RiderDetailType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    void window.tdf?.requestRider(id).then((r) => {
      if (active) {
        setRider(r)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [id])

  // Derive live context from the current state.
  const group = useMemo(
    () => state.groups.find((g) => g.riders.some((r) => r.id === id)),
    [state.groups, id]
  )
  const placements = useMemo(() => {
    return state.rankings
      .map((rk) => {
        const entry = rk.entries.find((e) => e.riderId === id)
        return entry ? { label: rk.label, entry } : null
      })
      .filter((x): x is { label: string; entry: (typeof state.rankings)[number]['entries'][number] } => x !== null)
  }, [state.rankings, id])

  const title = rider ? riderLabel({ shortName: rider.lastName, firstName: rider.firstName }) : 'Rider'

  if (loading) return <DetailShell title="Rider"><Loading /></DetailShell>

  if (!rider) {
    return (
      <DetailShell title="Rider">
        <p className="px-1 py-4 text-sm text-white/50">
          Rider details aren&apos;t available yet. The rider directory is published closer to /
          during the race.
        </p>
      </DetailShell>
    )
  }

  const age = ageFromBirthdate(rider.birthdate)

  return (
    <DetailShell title={title}>
      <div className="flex items-center gap-3">
        <Avatar src={rider.profileImageLarge} alt={title} fallback={rider.bib?.toString()} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-lg font-bold leading-tight">
              {[rider.firstName, rider.lastName].filter(Boolean).join(' ')}
            </span>
            <JerseyChip jersey={rider.jersey} />
          </div>
          {rider.teamName && (
            <button
              onClick={() => rider.teamId && openTeam(rider.teamId)}
              disabled={!rider.teamId}
              className="mt-0.5 flex items-center gap-1.5 text-sm text-white/70 hover:text-white disabled:cursor-default disabled:hover:text-white/70"
            >
              {rider.teamColor && (
                <span
                  className="h-3 w-3 rounded-sm ring-1 ring-black/30"
                  style={{ background: rider.teamColor }}
                />
              )}
              <span className="truncate">{rider.teamName}</span>
            </button>
          )}
        </div>
        <FollowButton kind="rider" id={rider.id} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {rider.bib !== undefined && <Field label="Bib" value={`${rider.bib}`} />}
        {rider.nationality && <Field label="Nationality" value={rider.nationality.toUpperCase()} />}
        {age !== undefined && <Field label="Age" value={`${age}`} />}
        {rider.victories !== undefined && <Field label="Victories" value={`${rider.victories}`} />}
        {rider.podiums !== undefined && <Field label="Podiums" value={`${rider.podiums}`} />}
        {rider.uciCode && <Field label="UCI ID" value={rider.uciCode} />}
      </div>

      {group && (
        <Section title="In the race">
          <div className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{group.name}</span>
              <span className="font-mono text-yellow-300">
                {formatGap(group.gapToLeaderSeconds) || 'lead'}
              </span>
            </div>
            {group.localization && (
              <div className="mt-0.5 truncate text-[11px] italic text-white/40">
                {group.localization}
              </div>
            )}
          </div>
        </Section>
      )}

      {placements.length > 0 && (
        <Section title="Classifications">
          <ul className="flex flex-col gap-0.5">
            {placements.map((p) => (
              <li
                key={p.label}
                className="flex items-center justify-between rounded px-1.5 py-1 text-xs odd:bg-white/[0.03]"
              >
                <span className="text-white/70">{p.label}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-white/90">P{p.entry.position}</span>
                  <span className="font-mono text-white/45">
                    {p.entry.position === 1
                      ? p.entry.timeDisplay ?? ''
                      : p.entry.gapDisplay ?? ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </DetailShell>
  )
}

function Loading(): React.JSX.Element {
  return <p className="px-1 py-4 text-sm text-white/40">Loading…</p>
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="mt-4">
      <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {title}
      </h3>
      {children}
    </div>
  )
}

export function Avatar({
  src,
  alt,
  fallback
}: {
  src?: string
  alt: string
  fallback?: string
}): React.JSX.Element {
  const [errored, setErrored] = useState(false)
  if (!src || errored) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/60">
        {fallback ?? alt.slice(0, 2).toUpperCase()}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className="h-14 w-14 shrink-0 rounded-full bg-white/10 object-cover"
    />
  )
}
