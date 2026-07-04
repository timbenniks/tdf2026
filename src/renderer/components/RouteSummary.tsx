import type { LiveRider, RaceGroup, RoutePoint, StageInfo } from '@shared/types'
import { SectionShell } from './Section'
import { RouteMap } from './RouteMap'

const TYPE_LABEL: Record<string, string> = {
  F: 'Fictive start',
  R: 'Start',
  N: 'Sprint',
  C: 'Chrono',
  A: 'Finish'
}

type Props = {
  route: RoutePoint[]
  groups?: RaceGroup[]
  liveRiders?: LiveRider[]
  stage?: StageInfo
}

export function RouteSummary({ route, groups = [], liveRiders = [], stage }: Props): React.JSX.Element {
  const notable = route.filter((p) => p.types.length > 0 || p.summitName)

  return (
    <SectionShell title={`Route (${route.length} pts)`}>
      {route.length === 0 ? (
        <p className="px-1 text-xs text-white/40">No route data.</p>
      ) : (
        <>
          <div className="mb-2">
            <RouteMap route={route} groups={groups} liveRiders={liveRiders} stage={stage} />
          </div>
          {notable.length > 0 && (
            <ul className="flex flex-col gap-1">
              {notable.slice(0, 8).map((p) => (
                <li key={p.index} className="flex items-center gap-2 text-[11px]">
                  {p.summitName ? (
                    <span className="rounded bg-red-500/20 px-1 py-0.5 font-mono text-[9px] text-red-300">
                      {p.summitCategory ? `cat ${p.summitCategory}` : 'climb'}
                    </span>
                  ) : (
                    <span className="rounded bg-white/10 px-1 py-0.5 font-mono text-[9px] text-white/60">
                      {p.types.map((t) => TYPE_LABEL[t] ?? t).join('/')}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-white/75">
                    {p.summitName ?? p.name ?? `Checkpoint ${p.checkpointNumber ?? p.index + 1}`}
                  </span>
                  {p.summitAltitude !== undefined && (
                    <span className="font-mono text-white/45">{p.summitAltitude} m</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </SectionShell>
  )
}
