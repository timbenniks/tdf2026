import { useMemo, useState } from 'react'
import type { RankingEntry, RankingSummary } from '@shared/types'
import { useRaceStore } from '../store/raceStore'
import { SectionShell } from './Section'
import { RankingRow } from './RankingRow'

function trailing(entry: RankingEntry): string {
  if (entry.position === 1) return entry.timeDisplay ?? ''
  return entry.gapDisplay ?? entry.timeDisplay ?? ''
}

const TOP = 8

// Show the most useful classifications first.
const PRIORITY = ['etg', 'ete', 'icg', 'img', 'iqg']

export function Rankings({ rankings }: { rankings: RankingSummary[] }): React.JSX.Element {
  const ordered = useMemo(() => {
    return [...rankings].sort((a, b) => {
      const ia = PRIORITY.indexOf(a.type)
      const ib = PRIORITY.indexOf(b.type)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
  }, [rankings])

  const [selected, setSelected] = useState(0)
  const openRider = useRaceStore((s) => s.openRider)
  const openTeam = useRaceStore((s) => s.openTeam)

  if (ordered.length === 0) {
    return (
      <SectionShell title="Rankings">
        <p className="px-1 text-xs text-white/40">No classifications available yet.</p>
      </SectionShell>
    )
  }

  const active = ordered[Math.min(selected, ordered.length - 1)]

  return (
    <SectionShell title="Rankings">
      {ordered.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {ordered.map((r, i) => (
            <button
              key={r.type}
              onClick={() => setSelected(i)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                i === selected
                  ? 'bg-yellow-400/20 text-yellow-200'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      <ol className="flex flex-col gap-0.5">
        {active.entries.slice(0, TOP).map((e) => (
          <RankingRow
            key={`${active.type}-${e.position}-${e.bib ?? 'x'}`}
            entry={e}
            trailing={trailing(e)}
            onOpenRider={openRider}
            onOpenTeam={openTeam}
          />
        ))}
      </ol>
    </SectionShell>
  )
}
