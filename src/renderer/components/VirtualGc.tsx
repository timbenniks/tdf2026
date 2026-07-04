import type { RankingSummary } from '@shared/types'
import { useRaceStore } from '../store/raceStore'
import { SectionShell } from './Section'
import { RankingRow } from './RankingRow'

const TOP = 6

/**
 * Live "yellow jersey on the road": GC standings projected from current time
 * gaps. Highlights when the virtual leader differs from the real GC leader,
 * which is the moment a breakaway is threatening the maillot jaune.
 */
export function VirtualGc({
  virtual,
  gcLeaderId
}: {
  virtual: RankingSummary
  gcLeaderId?: string
}): React.JSX.Element | null {
  const openRider = useRaceStore((s) => s.openRider)
  if (virtual.entries.length === 0) return null

  const leader = virtual.entries[0]
  const changed = gcLeaderId !== undefined && leader.riderId !== gcLeaderId

  return (
    <SectionShell title="On the road">
      <div className="mb-1.5 flex items-center gap-2 text-[10px]">
        {changed ? (
          <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 font-semibold text-yellow-200">
            Virtual maillot jaune
          </span>
        ) : (
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-white/45">GC holding on the road</span>
        )}
        <span className="text-white/35">projected from live gaps</span>
      </div>

      <ol className="flex flex-col gap-0.5">
        {virtual.entries.slice(0, TOP).map((e) => {
          const isLeader = e.position === 1
          return (
            <RankingRow
              key={`vgc-${e.position}-${e.bib ?? 'x'}`}
              entry={e}
              trailing={isLeader ? 'leader' : e.gapDisplay ?? ''}
              highlight={isLeader && changed}
              onOpenRider={openRider}
            />
          )
        })}
      </ol>
    </SectionShell>
  )
}
