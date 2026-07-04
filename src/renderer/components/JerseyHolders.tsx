import type { JerseyHolder } from '@shared/types'
import { useRaceStore } from '../store/raceStore'
import { JERSEY_LABEL, jerseyBackgroundStyle } from '@shared/jerseys'

export function JerseyHolders({ holders }: { holders: JerseyHolder[] }): React.JSX.Element | null {
  const openRider = useRaceStore((s) => s.openRider)
  if (holders.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-1.5 px-4 py-3">
      {holders.map((h) => (
        <button
          key={h.jersey}
          disabled={!h.riderId}
          onClick={() => h.riderId && openRider(h.riderId)}
          className={`flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-left ${
            h.riderId ? 'hover:bg-white/10' : 'cursor-default'
          }`}
        >
          <span
            className="h-5 w-4 shrink-0 rounded-sm ring-1 ring-black/30"
            style={jerseyBackgroundStyle(h.jersey)}
            title={`${JERSEY_LABEL[h.jersey]} jersey`}
          />
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-white/90">
              {h.riderName}
            </span>
            {h.teamName && (
              <span className="block truncate text-[10px] text-white/45">{h.teamName}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
