import type { RankingEntry } from '@shared/types'
import { useRaceStore } from '../store/raceStore'

/** Thin vertical team-color bar; becomes a button when it can open a team. */
export function TeamColorBar({
  color,
  teamId,
  title,
  onOpenTeam
}: {
  color?: string
  teamId?: string
  title?: string
  onOpenTeam?: (id: string) => void
}): React.JSX.Element | null {
  if (!color) return null
  if (onOpenTeam) {
    return (
      <button
        className="h-3 w-1 rounded-sm disabled:cursor-default"
        style={{ background: color }}
        title={title}
        disabled={!teamId}
        onClick={() => teamId && onOpenTeam(teamId)}
      />
    )
  }
  return <span className="h-3 w-1 rounded-sm" style={{ background: color }} title={title} />
}

function riderText(entry: RankingEntry): string {
  return entry.riderName ?? (entry.bib !== undefined ? `#${entry.bib}` : '—')
}

/**
 * One classification row: position, team color, clickable rider name, and a
 * trailing value (time or gap). Shared by every standings list.
 */
export function RankingRow({
  entry,
  trailing,
  highlight,
  onOpenRider,
  onOpenTeam
}: {
  entry: RankingEntry
  trailing: string
  highlight?: boolean
  onOpenRider?: (id: string) => void
  onOpenTeam?: (id: string) => void
}): React.JSX.Element {
  const followed = useRaceStore((s) =>
    entry.riderId ? s.follows.riders.includes(entry.riderId) : false
  )
  return (
    <li
      className={`flex items-center gap-2 rounded px-1.5 py-1 text-xs ${
        highlight ? 'bg-yellow-400/10' : 'odd:bg-white/[0.03]'
      }`}
    >
      <span className="w-5 text-right font-mono text-white/40">{entry.position}</span>
      <TeamColorBar
        color={entry.teamColor}
        teamId={entry.teamId}
        title={entry.teamName}
        onOpenTeam={onOpenTeam}
      />
      <button
        disabled={!entry.riderId}
        onClick={() => entry.riderId && onOpenRider?.(entry.riderId)}
        className={`flex min-w-0 flex-1 items-center gap-1 truncate text-left ${
          followed ? 'text-yellow-200' : 'text-white/85'
        } ${entry.riderId ? 'hover:text-white hover:underline' : 'cursor-default'}`}
      >
        {followed && <span className="shrink-0 text-yellow-300">★</span>}
        <span className="truncate">{riderText(entry)}</span>
      </button>
      <span className="font-mono text-white/55">{trailing}</span>
    </li>
  )
}
