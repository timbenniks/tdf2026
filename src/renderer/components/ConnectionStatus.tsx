import type { RaceConnectionState } from '@shared/types'

const CONFIG: Record<RaceConnectionState, { label: string; dot: string; text: string }> = {
  idle: { label: 'Idle', dot: 'bg-white/40', text: 'text-white/50' },
  loading: { label: 'Loading…', dot: 'bg-sky-400 animate-pulse', text: 'text-sky-300' },
  connected: { label: 'Connected', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  reconnecting: { label: 'Reconnecting…', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-300' },
  offline: { label: 'Offline', dot: 'bg-white/40', text: 'text-white/50' },
  error: { label: 'Error', dot: 'bg-red-500', text: 'text-red-300' }
}

type Props = {
  connection: RaceConnectionState
  lastUpdatedLabel: string
  error?: string
  onRefresh: () => void
  onReconnect: () => void
}

export function ConnectionStatus({
  connection,
  lastUpdatedLabel,
  error,
  onRefresh,
  onReconnect
}: Props): React.JSX.Element {
  const c = CONFIG[connection] ?? CONFIG.idle
  return (
    <footer className="flex items-center justify-between gap-2 border-t border-white/10 bg-black/20 px-4 py-2">
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${c.dot}`} />
          <span className={`text-[11px] font-medium ${c.text}`}>{c.label}</span>
        </div>
        <span className="truncate text-[10px] text-white/35" title={error}>
          {error ? error : `Updated ${lastUpdatedLabel}`}
        </span>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          onClick={onRefresh}
          className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium text-white/80 transition hover:bg-white/20"
        >
          Refresh
        </button>
        <button
          onClick={onReconnect}
          className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium text-white/80 transition hover:bg-white/20"
        >
          Reconnect
        </button>
      </div>
    </footer>
  )
}
