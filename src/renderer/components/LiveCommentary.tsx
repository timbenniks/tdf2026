import type { LiveMessage } from '@shared/types'
import { SectionShell } from './Section'

const MAX = 6

function timeLabel(iso?: string): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso.length <= 8 ? iso : ''
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function LiveCommentary({ messages }: { messages: LiveMessage[] }): React.JSX.Element {
  return (
    <SectionShell title="Commentary">
      {messages.length === 0 ? (
        <p className="px-1 text-xs text-white/40">No commentary yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {messages.slice(0, MAX).map((m) => (
            <li key={m.id} className="border-l-2 border-yellow-400/50 pl-2.5">
              {timeLabel(m.timestamp) && (
                <div className="text-[10px] font-mono text-white/35">{timeLabel(m.timestamp)}</div>
              )}
              {m.title && <div className="text-xs font-semibold text-white/85">{m.title}</div>}
              <div className="text-xs leading-snug text-white/70">{m.text}</div>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  )
}
