import { useEffect, useState } from 'react'
import type { RankingEntry, StageResults } from '@shared/types'
import { useRaceStore } from '../store/raceStore'
import { DetailShell } from './DetailShell'
import { SectionShell } from './Section'
import { RankingRow } from './RankingRow'
import { Podium } from './Podium'

const TOP = 12

function trailing(e: RankingEntry): string {
  if (e.position === 1) return e.timeDisplay ?? ''
  return e.gapDisplay ?? e.timeDisplay ?? ''
}

export function StageResultsView({
  year,
  stage
}: {
  year: number
  stage: number
}): React.JSX.Element {
  const openRider = useRaceStore((s) => s.openRider)
  const openTeam = useRaceStore((s) => s.openTeam)
  const [results, setResults] = useState<StageResults | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    void window.tdf?.requestStageResults(year, stage).then((r) => {
      if (active) {
        setResults(r)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [year, stage])

  const title = `Stage ${stage} results`

  if (loading) {
    return (
      <DetailShell title={title}>
        <p className="px-1 py-4 text-sm text-white/40">Loading results…</p>
      </DetailShell>
    )
  }

  if (!results || !results.hasData) {
    return (
      <DetailShell title={title}>
        <p className="px-1 py-4 text-sm text-white/50">
          No results available for this stage yet. Results appear once the stage has been ridden.
        </p>
      </DetailShell>
    )
  }

  const s = results.stage
  const finish = results.stageResult

  return (
    <DetailShell title={title}>
      {(s?.departureCity || s?.arrivalCity) && (
        <div className="mb-1 flex items-center text-sm font-medium text-white/85">
          <span className="truncate">{s?.departureCity ?? '?'}</span>
          <span className="mx-1.5 shrink-0 text-white/30">→</span>
          <span className="truncate">{s?.arrivalCity ?? '?'}</span>
        </div>
      )}
      {s?.typeLabel && <div className="mb-2 text-[11px] text-white/45">{s.typeLabel}</div>}

      {finish && finish.entries.length > 0 && (
        <>
          <Podium entries={finish.entries} />
          <SectionShell title="Stage result">
            <ol className="flex flex-col gap-0.5">
              {finish.entries.slice(0, TOP).map((e) => (
                <RankingRow
                  key={`sr-${e.position}-${e.bib ?? 'x'}`}
                  entry={e}
                  trailing={trailing(e)}
                  onOpenRider={openRider}
                  onOpenTeam={openTeam}
                />
              ))}
            </ol>
          </SectionShell>
        </>
      )}

      {results.gc && results.gc.entries.length > 0 && (
        <SectionShell title="General classification">
          <ol className="flex flex-col gap-0.5">
            {results.gc.entries.slice(0, TOP).map((e) => (
              <RankingRow
                key={`gc-${e.position}-${e.bib ?? 'x'}`}
                entry={e}
                trailing={trailing(e)}
                onOpenRider={openRider}
                onOpenTeam={openTeam}
              />
            ))}
          </ol>
        </SectionShell>
      )}
    </DetailShell>
  )
}
