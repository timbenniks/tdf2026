import type { RankingEntry } from '@shared/types'
import { useRaceStore } from '../store/raceStore'

const ORDER = [2, 1, 3] // visual left-to-right: 2nd, 1st, 3rd
const HEIGHT: Record<number, string> = { 1: 'h-16', 2: 'h-12', 3: 'h-9' }
const MEDAL: Record<number, string> = { 1: '#ffd400', 2: '#c0c7d1', 3: '#cd7f32' }

function riderText(e: RankingEntry): string {
  return e.riderName ?? (e.bib !== undefined ? `#${e.bib}` : '—')
}

export function Podium({ entries }: { entries: RankingEntry[] }): React.JSX.Element | null {
  const openRider = useRaceStore((s) => s.openRider)
  const byPos = new Map(entries.map((e) => [e.position, e]))
  const top = ORDER.map((p) => byPos.get(p)).filter((e): e is RankingEntry => e !== undefined)
  if (top.length === 0) return null

  return (
    <div className="flex items-end justify-center gap-2 py-2">
      {top.map((e) => (
        <button
          key={e.position}
          disabled={!e.riderId}
          onClick={() => e.riderId && openRider(e.riderId)}
          className={`flex w-1/3 flex-col items-center ${e.riderId ? '' : 'cursor-default'}`}
        >
          <span className="mb-1 max-w-full truncate text-[11px] font-semibold text-white/90">
            {riderText(e)}
          </span>
          {e.teamName && (
            <span className="mb-1 max-w-full truncate text-[9px] text-white/40">{e.teamName}</span>
          )}
          <div
            className={`flex w-full ${HEIGHT[e.position]} items-start justify-center rounded-t-md`}
            style={{ background: `${MEDAL[e.position]}33`, borderTop: `2px solid ${MEDAL[e.position]}` }}
          >
            <span className="mt-1 font-mono text-sm font-bold" style={{ color: MEDAL[e.position] }}>
              {e.position}
            </span>
          </div>
          <span className="mt-1 font-mono text-[10px] text-white/55">
            {e.position === 1 ? e.timeDisplay ?? '' : e.gapDisplay ?? ''}
          </span>
        </button>
      ))}
    </div>
  )
}
