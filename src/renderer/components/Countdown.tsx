import { useEffect, useState } from 'react'
import { formatCountdown } from '../format'

type Props = {
  /** ISO start instant to count down to. */
  targetIso?: string
  /** Label shown before the time (e.g. "Starts in"). */
  prefix?: string
  className?: string
}

/**
 * Self-ticking countdown. Renders nothing once the target is reached or invalid,
 * so callers can drop it in unconditionally.
 */
export function Countdown({ targetIso, prefix = 'Starts in', className }: Props): React.JSX.Element | null {
  const target = targetIso ? Date.parse(targetIso) : NaN
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (Number.isNaN(target)) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])

  if (Number.isNaN(target)) return null
  const remaining = target - now
  if (remaining <= 0) return null

  return (
    <span className={className ?? 'font-mono text-yellow-300'}>
      {prefix ? `${prefix} ` : ''}
      {formatCountdown(remaining)}
    </span>
  )
}
