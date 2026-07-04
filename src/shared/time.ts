// Time formatting shared by the main process (works in milliseconds) and the
// renderer (works in seconds). Single source of truth for the H:MM:SS / M:SS shape.

/** Format a non-negative duration in whole seconds as `H:MM:SS` or `M:SS`. */
export function formatHMS(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`
  return `${m}:${ss}`
}
