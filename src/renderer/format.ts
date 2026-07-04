import { formatHMS } from '@shared/time'

export function formatSeconds(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '–'
  return formatHMS(Math.abs(seconds))
}

export function formatGap(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return ''
  return `+${formatSeconds(seconds)}`
}

export function formatKm(km?: number): string {
  if (km === undefined || !Number.isFinite(km) || km < 0) return '–'
  if (km >= 10) return `${Math.round(km)} km`
  return `${km.toFixed(1)} km`
}

export function formatSpeed(kmh?: number): string {
  if (kmh === undefined || !Number.isFinite(kmh)) return '–'
  return `${kmh.toFixed(1)} km/h`
}

export function timeAgo(iso?: string, now: number = Date.now()): string {
  if (!iso) return 'never'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 'never'
  const sec = Math.max(0, Math.round((now - t) / 1000))
  if (sec < 5) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  return `${hr}h ago`
}

export function ageFromBirthdate(iso?: string, now: number = Date.now()): number | undefined {
  if (!iso) return undefined
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return undefined
  const birth = new Date(t)
  const today = new Date(now)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1
  return age >= 0 && age < 120 ? age : undefined
}

export function formatDateLong(iso?: string): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  return new Date(t).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Compute the ISO start instant of a stage by combining its date (midnight, with
 * the race's UTC offset) and startTime. Returns undefined if not derivable.
 */
export function stageStartIso(stage?: { date?: string; startTime?: string }): string | undefined {
  if (!stage?.date) return undefined
  if (!stage.startTime) return stage.date
  const m = stage.date.match(/^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(.*)$/)
  if (!m) return undefined
  return `${m[1]}T${stage.startTime}${m[2] ?? ''}`
}

/** Format a positive millisecond duration as "1d 3h 20m", "2:05:09" or "4:31". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  const ss = String(s).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${m}:${ss}`
}

export function riderLabel(r: {
  shortName?: string
  lastName?: string
  firstName?: string
  bib?: number
}): string {
  const name = r.shortName || r.lastName || r.firstName
  if (name) return name
  return r.bib !== undefined ? `#${r.bib}` : '—'
}
