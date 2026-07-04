import type { StageInfo } from '@shared/types'
import { formatDateLong } from '../format'
import { useRaceStore } from '../store/raceStore'
import logoUrl from '../assets/tdf-logo-white.png'

type Props = {
  stage?: StageInfo
  year: number
  isLive?: boolean
  mock?: boolean
}

export function Header({ stage, year, isLive, mock }: Props): React.JSX.Element {
  const openSchedule = useRaceStore((s) => s.openSchedule)
  return (
    <header className="px-4 pt-3 pb-2.5 border-b border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={logoUrl}
            alt="Tour de France"
            className="h-7 w-auto opacity-95"
            draggable={false}
          />
          <span className="text-[11px] font-semibold text-white/40">{year}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={openSchedule}
            title="Schedule & results"
            className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70 transition hover:bg-white/20"
          >
            Schedule
          </button>
          {mock && (
            <span className="rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-fuchsia-300">
              mock
            </span>
          )}
          {isLive && (
            <span className="flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              live
            </span>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-bold leading-none">
          {stage?.stageNum ? `Stage ${stage.stageNum}` : 'No stage'}
        </span>
        {stage?.typeLabel && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
            {stage.typeLabel}
          </span>
        )}
        {stage?.isCancelled && (
          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
            cancelled
          </span>
        )}
      </div>

      {(stage?.departureCity || stage?.arrivalCity) && (
        <div className="mt-1 flex items-center truncate text-sm font-medium text-white/85">
          <span className="truncate">{stage?.departureCity ?? '?'}</span>
          <span className="mx-1.5 shrink-0 text-white/30">→</span>
          <span className="truncate">{stage?.arrivalCity ?? '?'}</span>
        </div>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/45">
        {formatDateLong(stage?.date) && <span>{formatDateLong(stage?.date)}</span>}
        {(stage?.lengthDisplay || stage?.lengthKm) && (
          <span className="text-white/60">{stage?.lengthDisplay ?? `${stage?.lengthKm} km`}</span>
        )}
        {stage?.startTime && (
          <span>
            start {stage.startTime.slice(0, 5)}
            {stage?.endTime ? `–${stage.endTime.slice(0, 5)}` : ''}
          </span>
        )}
      </div>
    </header>
  )
}
