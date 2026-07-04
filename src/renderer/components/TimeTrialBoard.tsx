import type { LiveRider } from '@shared/types'
import { useRaceStore } from '../store/raceStore'
import { formatGap, formatKm, formatSpeed } from '../format'
import { SectionShell } from './Section'
import { JerseyDot } from './JerseyBadges'
import { TeamColorBar } from './RankingRow'

const TOP = 15

type Props = {
  riders: LiveRider[]
  kind?: 'team' | 'individual'
}

export function TimeTrialBoard({ riders, kind }: Props): React.JSX.Element {
  const openRider = useRaceStore((s) => s.openRider)
  const label = kind === 'team' ? 'Team time trial' : 'Individual time trial'

  if (riders.length === 0) {
    return (
      <SectionShell title={label}>
        <p className="px-1 py-2 text-xs text-white/40">
          No live timing yet. Riders appear on course once the time trial is under way.
        </p>
      </SectionShell>
    )
  }

  const onCourse = riders.filter((r) => r.status !== 'finished').length

  return (
    <SectionShell title={`${label} — on course (${onCourse}/${riders.length})`}>
      <div className="flex flex-col gap-0.5">
        {riders.slice(0, TOP).map((r) => {
          const clickable = !r.id.startsWith('bib-')
          return (
            <button
              key={r.id}
              disabled={!clickable}
              onClick={() => clickable && openRider(r.id)}
              className={`flex items-center gap-2 rounded px-1.5 py-1 text-xs odd:bg-white/[0.03] ${
                clickable ? 'hover:bg-white/10' : 'cursor-default'
              }`}
            >
              <span className="w-5 text-right font-mono text-white/40">{r.position ?? '–'}</span>
              <TeamColorBar color={r.teamColor} title={r.teamName} />
              <span className="min-w-0 flex-1 truncate text-left text-white/85">
                {r.shortName ?? r.riderName ?? `#${r.bib}`}
                <JerseyDot jersey={r.jersey} />
              </span>
              {r.status === 'finished' ? (
                <span className="font-mono text-[10px] uppercase text-emerald-300">fin</span>
              ) : (
                <span className="font-mono text-[10px] text-white/45">
                  {formatKm(r.kmToFinish)} · {formatSpeed(r.speedKmh)}
                </span>
              )}
              <span className="w-12 text-right font-mono text-yellow-300">
                {r.position === 1 ? 'lead' : formatGap(r.gapToLeaderSeconds) || ''}
              </span>
            </button>
          )
        })}
      </div>
    </SectionShell>
  )
}
