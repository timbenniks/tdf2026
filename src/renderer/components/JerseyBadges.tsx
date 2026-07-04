import { JERSEY_HEX, JERSEY_LABEL, jerseyBackgroundStyle } from '@shared/jerseys'

type Props = {
  yellow?: boolean
  green?: boolean
  polkaDot?: boolean
  white?: boolean
  className?: string
}

const DOT = 'inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/30'

export function JerseyBadges({ yellow, green, polkaDot, white, className }: Props): React.JSX.Element | null {
  if (!yellow && !green && !polkaDot && !white) return null
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`} title="Jersey holders in group">
      {yellow && (
        <span className={DOT} style={jerseyBackgroundStyle('yellow')} aria-label="yellow jersey" />
      )}
      {green && (
        <span className={DOT} style={jerseyBackgroundStyle('green')} aria-label="green jersey" />
      )}
      {polkaDot && (
        <span className={DOT} style={jerseyBackgroundStyle('polkaDot')} aria-label="polka dot jersey" />
      )}
      {white && (
        <span className={DOT} style={jerseyBackgroundStyle('white')} aria-label="white jersey" />
      )}
    </span>
  )
}

/** A small colored dot used inline next to a rider who wears a jersey. */
export function JerseyDot({ jersey }: { jersey?: string }): React.JSX.Element | null {
  if (!jersey || !JERSEY_HEX[jersey]) return null
  return (
    <span
      className="ml-1 inline-block h-2 w-2 rounded-full ring-1 ring-black/30 align-middle"
      style={jerseyBackgroundStyle(jersey)}
      title={`${JERSEY_LABEL[jersey]} jersey`}
    />
  )
}
