import type { RaceGroup } from '@shared/types'
import { formatGap, formatKm, formatSpeed, riderLabel } from '../format'
import { useRaceStore } from '../store/raceStore'
import { JerseyBadges, JerseyDot } from './JerseyBadges'

const TOP_RIDERS = 5

function GapTrend({ group }: { group: RaceGroup }): React.JSX.Element | null {
  if (!group.gapToLeaderSeconds || !group.gapTrend) return null
  if (group.gapTrend === 'steady') {
    return <span className="font-mono text-[10px] text-white/35">→ holding</span>
  }
  const closing = group.gapTrend === 'in'
  const rate = group.gapTrendSecPerMin
  const rateLabel = rate ? `${Math.abs(rate)}s/min` : ''
  return (
    <span className={`font-mono text-[10px] ${closing ? 'text-emerald-300' : 'text-red-300'}`}>
      {closing ? '▼' : '▲'} {closing ? 'closing' : 'gaining'}
      {rateLabel ? ` ${rateLabel}` : ''}
    </span>
  )
}

export function GroupCard({ group, isLead }: { group: RaceGroup; isLead: boolean }): React.JSX.Element {
  const openRider = useRaceStore((s) => s.openRider)
  const count = group.size ?? group.bibs.length
  const shown = group.riders.slice(0, TOP_RIDERS)
  const overflow = Math.max(0, count - shown.length)
  const gap = formatGap(group.gapToLeaderSeconds)

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${isLead ? 'bg-emerald-400' : 'bg-white/30'}`}
          />
          <span className="truncate text-sm font-semibold">{group.name}</span>
          <JerseyBadges
            yellow={group.hasYellowJersey}
            green={group.hasGreenJersey}
            polkaDot={group.hasPolkaDotJersey}
            white={group.hasWhiteJersey}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 text-right">
          <GapTrend group={group} />
          {gap ? (
            <span className="font-mono text-sm font-semibold text-yellow-300">{gap}</span>
          ) : (
            <span className="font-mono text-xs text-emerald-300">lead</span>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/55">
        <span>
          <span className="text-white/35">riders</span> {count}
        </span>
        {group.speedKmh !== undefined && (
          <span>
            <span className="text-white/35">speed</span> {formatSpeed(group.speedKmh)}
          </span>
        )}
        {group.remainingDistanceKm !== undefined && (
          <span>
            <span className="text-white/35">to go</span> {formatKm(group.remainingDistanceKm)}
          </span>
        )}
        {group.gapToPreviousSeconds !== undefined && group.gapToPreviousSeconds > 0 && (
          <span>
            <span className="text-white/35">to prev</span> {formatGap(group.gapToPreviousSeconds)}
          </span>
        )}
      </div>

      {shown.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/70">
          {shown.map((r) => {
            const clickable = !r.id.startsWith('bib-')
            return (
              <button
                key={r.id}
                disabled={!clickable}
                onClick={() => clickable && openRider(r.id)}
                className={`inline-flex items-center rounded px-0.5 ${
                  clickable ? 'hover:bg-white/10 hover:text-white' : 'cursor-default'
                }`}
              >
                {r.bib !== undefined && <span className="mr-1 text-white/35">{r.bib}</span>}
                <span className="truncate">{riderLabel(r)}</span>
                <JerseyDot jersey={r.jersey} />
              </button>
            )
          })}
          {overflow > 0 && <span className="text-white/35">+{overflow} more</span>}
        </div>
      )}

      {group.localization && (
        <div className="mt-1 truncate text-[10px] italic text-white/35">{group.localization}</div>
      )}
    </div>
  )
}
