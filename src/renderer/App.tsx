import { useEffect, useState } from 'react'
import type { RaceGroup } from '@shared/types'
import { useRaceStore } from './store/raceStore'
import { Header } from './components/Header'
import { GroupList } from './components/GroupList'
import { SectionShell } from './components/Section'
import { LiveCommentary } from './components/LiveCommentary'
import { Rankings } from './components/Rankings'
import { RouteSummary } from './components/RouteSummary'
import { RiderDetail } from './components/RiderDetail'
import { TeamDetail } from './components/TeamDetail'
import { Schedule } from './components/Schedule'
import { StageResultsView } from './components/StageResultsView'
import { TimeTrialBoard } from './components/TimeTrialBoard'
import { VirtualGc } from './components/VirtualGc'
import { StageProfile } from './components/StageProfile'
import { JerseyHolders } from './components/JerseyHolders'
import { Weather } from './components/Weather'
import { RestDayScreen } from './components/RestDayScreen'
import { Countdown } from './components/Countdown'
import { PanelShell } from './components/PanelShell'
import { formatGap, formatKm, stageStartIso, timeAgo } from './format'

const PELOTON_HINTS = ['peloton', 'main', 'bunch', 'gruppo']

function findPeloton(groups: RaceGroup[]): RaceGroup | undefined {
  if (groups.length === 0) return undefined
  const named = groups.find((g) => PELOTON_HINTS.some((h) => g.name.toLowerCase().includes(h)))
  if (named) return named
  return [...groups].sort(
    (a, b) => (b.size ?? b.bibs.length) - (a.size ?? a.bibs.length)
  )[0]
}

function LiveSummary({ groups, lastUpdatedLabel }: { groups: RaceGroup[]; lastUpdatedLabel: string }): React.JSX.Element {
  const lead = groups[0]
  const peloton = findPeloton(groups)
  const gap =
    peloton && lead && peloton.id !== lead.id ? formatGap(peloton.gapToLeaderSeconds) : ''
  const flamme = lead?.remainingDistanceKm !== undefined && lead.remainingDistanceKm > 0 && lead.remainingDistanceKm <= 1

  return (
    <SectionShell title="Live">
      {flamme && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          Flamme rouge — {formatKm(lead?.remainingDistanceKm)}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="To finish" value={formatKm(lead?.remainingDistanceKm)} />
        <Stat label="Lead group" value={lead ? lead.name : '–'} />
        <Stat label="Gap to bunch" value={gap || (lead ? 'together' : '–')} highlight />
      </div>
      <div className="mt-1.5 text-[10px] text-white/35">Updated {lastUpdatedLabel}</div>
    </SectionShell>
  )
}

function Stat({
  label,
  value,
  highlight
}: {
  label: string
  value: string
  highlight?: boolean
}): React.JSX.Element {
  return (
    <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-white/35">{label}</div>
      <div
        className={`mt-0.5 truncate text-sm font-semibold ${
          highlight ? 'text-yellow-300' : 'text-white/90'
        }`}
        title={value}
      >
        {value}
      </div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  const { state, receivedAt, view, refresh, reconnect, init } = useRaceStore()
  const [now, setNow] = useState(Date.now())

  useEffect(() => init(), [init])

  // Re-render once a second so "updated Xs ago" stays fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (view.name === 'rider') return <RiderDetail id={view.id} />
  if (view.name === 'team') return <TeamDetail id={view.id} />
  if (view.name === 'schedule') return <Schedule />
  if (view.name === 'stageResults') return <StageResultsView year={view.year} stage={view.stage} />

  const isTimeTrial = state.stage?.isTimeTrial ?? state.stage?.showGroups === false

  // The edition-level isLive flag is true for the whole Tour window, so it's not a
  // reliable "racing right now" signal. Use actual live telemetry instead.
  const racingNow =
    state.raceStatus === true || state.groups.length > 0 || state.liveRiders.length > 0
  const offDay = (state.isRestDay || state.raceFinished) && !racingNow

  const startIso = stageStartIso(state.stage)
  const startMs = startIso ? Date.parse(startIso) : NaN
  const preStart = !racingNow && !Number.isNaN(startMs) && startMs > now

  const lastUpdatedLabel = state.lastUpdated
    ? timeAgo(state.lastUpdated)
    : receivedAt
      ? timeAgo(new Date(receivedAt).toISOString())
      : 'never'

  const footer = {
    connection: state.connection,
    lastUpdatedLabel,
    error: state.error,
    onRefresh: refresh,
    onReconnect: reconnect
  }

  if (offDay) {
    return (
      <PanelShell footer={footer}>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <RestDayScreen state={state} />
        </main>
      </PanelShell>
    )
  }

  return (
    <PanelShell footer={footer}>
      <Header stage={state.stage} year={state.year} isLive={racingNow} mock={state.mock} />

      {preStart && (
        <div className="flex items-center justify-center gap-2 border-b border-white/10 bg-yellow-400/10 px-4 py-1.5 text-xs">
          <span className="text-white/60">Stage {state.stage?.stageNum} starts in</span>
          <Countdown
            targetIso={startIso}
            prefix=""
            className="font-mono text-sm font-semibold text-yellow-300"
          />
        </div>
      )}

      <main className="min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto">
        <JerseyHolders holders={state.jerseyHolders} />
        {isTimeTrial ? (
          <TimeTrialBoard riders={state.liveRiders} kind={state.stage?.timeTrialKind} />
        ) : (
          <>
            {state.groups.length > 0 && (
              <LiveSummary groups={state.groups} lastUpdatedLabel={lastUpdatedLabel} />
            )}
            <GroupList groups={state.groups} />
            {state.virtualGc && (
              <VirtualGc
                virtual={state.virtualGc}
                gcLeaderId={state.rankings.find((r) => r.type === 'etg')?.entries[0]?.riderId}
              />
            )}
          </>
        )}
        {state.weather && <Weather weather={state.weather} />}
        <LiveCommentary messages={state.commentary} />
        <Rankings rankings={state.rankings} />
        {!isTimeTrial && (
          <StageProfile route={state.route} stage={state.stage} groups={state.groups} />
        )}
        <RouteSummary route={state.route} groups={state.groups} liveRiders={state.liveRiders} stage={state.stage} />
      </main>
    </PanelShell>
  )
}
