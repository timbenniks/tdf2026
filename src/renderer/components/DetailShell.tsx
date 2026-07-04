import { useRaceStore } from '../store/raceStore'
import { JERSEY_LABEL_LONG, jerseyBackgroundStyle } from '@shared/jerseys'

export function DetailShell({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  const goHome = useRaceStore((s) => s.goHome)
  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-xl">
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <button
          onClick={goHome}
          className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium text-white/80 transition hover:bg-white/20"
        >
          <span className="text-sm leading-none">‹</span> Back
        </button>
        <span className="truncate text-sm font-semibold">{title}</span>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</main>
    </div>
  )
}

export function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg bg-white/[0.04] px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-white/35">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-white/90" title={value}>
        {value}
      </div>
    </div>
  )
}

export function JerseyChip({ jersey }: { jersey?: string }): React.JSX.Element | null {
  if (!jersey || !JERSEY_LABEL_LONG[jersey]) return null
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-black"
      style={jerseyBackgroundStyle(jersey)}
    >
      {JERSEY_LABEL_LONG[jersey]}
    </span>
  )
}
