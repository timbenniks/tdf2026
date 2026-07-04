import type { RaceWeather } from '@shared/types'
import { SectionShell } from './Section'

const RISK_STYLE: Record<RaceWeather['echelonRisk'], { label: string; cls: string }> = {
  none: { label: 'No echelon risk', cls: 'bg-white/5 text-white/45' },
  low: { label: 'Low echelon risk', cls: 'bg-emerald-400/15 text-emerald-200' },
  moderate: { label: 'Echelon risk', cls: 'bg-amber-400/20 text-amber-200' },
  high: { label: 'High echelon risk', cls: 'bg-red-400/20 text-red-200' }
}

const WIND_TYPE_LABEL: Record<NonNullable<RaceWeather['windType']>, string> = {
  head: 'headwind',
  tail: 'tailwind',
  cross: 'crosswind'
}

/**
 * Wind arrow points in the direction the wind pushes the riders. windRelDeg is
 * measured from the direction of travel (0 = headwind, blowing toward the rider),
 * so an arrow at 180° (pointing "up"/forward) is a headwind.
 */
function WindArrow({ relDeg }: { relDeg: number }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" style={{ transform: `rotate(${relDeg}deg)` }}>
      <path d="M12 3 L12 21 M12 3 L7 9 M12 3 L17 9" fill="none" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Cell({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-white/35">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-white/90">{value}</div>
    </div>
  )
}

export function Weather({ weather }: { weather: RaceWeather }): React.JSX.Element | null {
  const hasTemp = weather.tempC !== undefined
  const hasWind = weather.windKmh !== undefined
  if (!hasTemp && !hasWind) return null

  const risk = RISK_STYLE[weather.echelonRisk]
  const windValue = hasWind
    ? `${weather.windKmh} km/h${weather.windType ? ` ${WIND_TYPE_LABEL[weather.windType]}` : ''}`
    : '–'

  return (
    <SectionShell title="Weather & wind">
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <Cell label="Temp" value={hasTemp ? `${weather.tempC}°C` : '–'} />
          <Cell label="Wind" value={windValue} />
        </div>
        {weather.windRelDeg !== undefined && (
          <div
            className="flex flex-col items-center rounded-lg bg-white/[0.04] px-2 py-1"
            title={`Wind ${weather.windRelDeg}° relative to travel`}
          >
            <WindArrow relDeg={weather.windRelDeg} />
            <span className="text-[9px] text-white/35">wind</span>
          </div>
        )}
      </div>
      <div className={`mt-2 inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ${risk.cls}`}>
        {risk.label}
      </div>
    </SectionShell>
  )
}
