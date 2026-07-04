import type { LiveRaceState, StageInfo } from '@shared/types'
import { formatDateLong, stageStartIso } from '../format'
import { useRaceStore } from '../store/raceStore'
import { Countdown } from './Countdown'
import logoUrl from '../assets/tdf-logo-white.png'

function NextStageCard({ stage }: { stage: StageInfo }): React.JSX.Element {
  return (
    <div className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/40">
        Next up
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold leading-none">Stage {stage.stageNum}</span>
        {stage.typeLabel && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
            {stage.typeLabel}
          </span>
        )}
      </div>
      {(stage.departureCity || stage.arrivalCity) && (
        <div className="mt-1 flex items-center text-sm font-medium text-white/85">
          <span className="truncate">{stage.departureCity ?? '?'}</span>
          <span className="mx-1.5 shrink-0 text-white/30">→</span>
          <span className="truncate">{stage.arrivalCity ?? '?'}</span>
        </div>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-white/45">
        {formatDateLong(stage.date) && <span>{formatDateLong(stage.date)}</span>}
        {(stage.lengthDisplay || stage.lengthKm) && (
          <span className="text-white/60">{stage.lengthDisplay ?? `${stage.lengthKm} km`}</span>
        )}
        {stage.startTime && <span>start {stage.startTime.slice(0, 5)}</span>}
      </div>
      <div className="mt-2 border-t border-white/5 pt-2 text-sm font-semibold">
        <Countdown targetIso={stageStartIso(stage)} />
      </div>
    </div>
  )
}

export function RestDayScreen({ state }: { state: LiveRaceState }): React.JSX.Element {
  const openSchedule = useRaceStore((s) => s.openSchedule)
  const finished = state.raceFinished
  const title = finished ? 'Tour complete' : 'Rest day'
  const subtitle = finished
    ? `The ${state.year} Tour de France has finished.`
    : 'No stage today — the peloton recovers.'

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <img src={logoUrl} alt="Tour de France" className="h-9 w-auto opacity-95" draggable={false} />
      <div>
        <div className="text-2xl font-bold">{title}</div>
        <div className="mt-1 text-sm text-white/50">{subtitle}</div>
      </div>

      {!finished && state.nextStage && <NextStageCard stage={state.nextStage} />}

      <button
        onClick={openSchedule}
        className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/20"
      >
        Schedule & results
      </button>

      <div className="text-[11px] text-white/30">{state.year} · {state.connection}</div>
    </div>
  )
}
