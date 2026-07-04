import { useMemo } from 'react'
import type { RaceGroup, RoutePoint, StageInfo } from '@shared/types'
import { CLIMB_CATEGORY_LABELS, CLIMB_CATEGORY_RANK } from '@shared/config'
import { buildStageProfile, progressKm, type ClimbPoint } from '../profile'
import { formatKm } from '../format'
import { SectionShell } from './Section'

const W = 320
const H = 84
const PAD_X = 6
const PAD_TOP = 10
const PAD_BOTTOM = 14

function catColor(category: string): string {
  switch (category) {
    case 'HC':
      return '#f87171'
    case '1':
      return '#fb923c'
    case '2':
      return '#fbbf24'
    case '3':
      return '#a3e635'
    default:
      return '#5eead4'
  }
}

function ClimbRow({ climb }: { climb: ClimbPoint }): React.JSX.Element {
  const label = CLIMB_CATEGORY_LABELS[climb.category] ?? climb.category
  return (
    <li className="flex items-center gap-2 rounded px-1.5 py-1 text-[11px] odd:bg-white/[0.03]">
      <span
        className="inline-flex h-4 min-w-[1.6rem] items-center justify-center rounded px-1 text-[9px] font-bold text-black"
        style={{ background: catColor(climb.category) }}
      >
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate text-white/85">{climb.name ?? 'Climb'}</span>
      {climb.gradient !== undefined && <span className="font-mono text-white/45">{climb.gradient}%</span>}
      {climb.altitude !== undefined && (
        <span className="font-mono text-white/55">{Math.round(climb.altitude)}m</span>
      )}
      <span className="w-12 text-right font-mono text-yellow-300/80">{formatKm(climb.km)}</span>
    </li>
  )
}

export function StageProfile({
  route,
  stage,
  groups
}: {
  route: RoutePoint[]
  stage?: StageInfo
  groups: RaceGroup[]
}): React.JSX.Element | null {
  const profile = useMemo(() => buildStageProfile(route, stage), [route, stage])

  if (route.length === 0 || profile.totalKm <= 0) return null

  const total = profile.totalKm
  const x = (km: number): number => PAD_X + (km / total) * (W - 2 * PAD_X)

  const plotTop = PAD_TOP
  const plotBottom = H - PAD_BOTTOM
  const maxAlt = profile.maxAltitude ?? 0
  const y = (alt: number): number => {
    if (maxAlt <= 0) return plotBottom
    return plotBottom - (alt / maxAlt) * (plotBottom - plotTop)
  }

  const areaPath = profile.samples.length
    ? `M ${x(profile.samples[0].km)} ${plotBottom} ` +
      profile.samples.map((s) => `L ${x(s.km)} ${y(s.alt)}`).join(' ') +
      ` L ${x(profile.samples[profile.samples.length - 1].km)} ${plotBottom} Z`
    : `M ${x(0)} ${plotBottom - 1} L ${x(total)} ${plotBottom - 1}`

  const done = progressKm(total, groups[0])
  const sprints = profile.keyPoints.filter((k) => k.kind === 'sprint')

  return (
    <SectionShell title="Stage profile">
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/45">
        <span>
          <span className="text-white/30">distance</span>{' '}
          <span className="text-white/70">{formatKm(total)}</span>
        </span>
        <span>
          <span className="text-white/30">climbs</span>{' '}
          <span className="text-white/70">{profile.climbs.length || '—'}</span>
        </span>
        {profile.maxAltitude !== undefined && (
          <span>
            <span className="text-white/30">highest</span>{' '}
            <span className="text-white/70">{Math.round(profile.maxAltitude)}m</span>
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Stage elevation profile"
      >
        <defs>
          <linearGradient id="profileFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(250,204,21,0.35)" />
            <stop offset="100%" stopColor="rgba(250,204,21,0.04)" />
          </linearGradient>
        </defs>

        <line
          x1={PAD_X}
          y1={plotBottom}
          x2={W - PAD_X}
          y2={plotBottom}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />

        <path d={areaPath} fill="url(#profileFill)" stroke="rgba(250,204,21,0.7)" strokeWidth="1" />

        {/* Live progress */}
        {done !== undefined && (
          <>
            <rect
              x={PAD_X}
              y={plotTop}
              width={Math.max(0, x(done) - PAD_X)}
              height={plotBottom - plotTop}
              fill="rgba(16,185,129,0.10)"
            />
            <line
              x1={x(done)}
              y1={plotTop - 2}
              x2={x(done)}
              y2={plotBottom}
              stroke="#34d399"
              strokeWidth="1.5"
            />
          </>
        )}

        {/* Sprint markers */}
        {sprints.map((s, i) => (
          <circle key={`sp-${i}`} cx={x(s.km)} cy={plotBottom} r="2.5" fill="#22d3ee" />
        ))}

        {/* Climb markers */}
        {profile.climbs.map((c, i) => {
          const rank = CLIMB_CATEGORY_RANK[c.category] ?? 1
          const size = 3 + rank
          const cx = x(c.km)
          const cy = c.altitude !== undefined ? y(c.altitude) : plotBottom
          return (
            <polygon
              key={`cl-${i}`}
              points={`${cx},${cy - size} ${cx - size},${cy + size * 0.7} ${cx + size},${cy + size * 0.7}`}
              fill={catColor(c.category)}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="0.5"
            />
          )
        })}
      </svg>

      <div className="mt-0.5 flex justify-between text-[9px] text-white/30">
        <span>{stage?.departureCity ?? 'Start'} · 0 km</span>
        <span>
          {formatKm(total)} · {stage?.arrivalCity ?? 'Finish'}
        </span>
      </div>

      {profile.climbs.length > 0 ? (
        <ol className="mt-2 flex flex-col gap-0.5">
          {profile.climbs.map((c, i) => (
            <ClimbRow key={`row-${i}`} climb={c} />
          ))}
        </ol>
      ) : (
        <p className="mt-2 px-1 text-[11px] text-white/40">Flat stage — no categorized climbs.</p>
      )}
    </SectionShell>
  )
}
