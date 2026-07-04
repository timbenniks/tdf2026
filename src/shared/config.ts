// Shared configuration. No node/electron imports here so it can be used from both
// the main process and the renderer.

export const RACE_CENTER_BASE_URL = 'https://racecenter.letour.fr'
export const SSE_URL = `${RACE_CENTER_BASE_URL}/live-stream`

/** Default season/stage to follow before live detection kicks in. */
export const DEFAULT_YEAR = 2026
export const DEFAULT_STAGE = 1

/**
 * When true, the app replays bundled fixtures instead of hitting the network.
 * Useful off-season (archived telemetry/flash endpoints come back empty).
 * Can also be toggled at runtime via the `MOCK=1` environment variable.
 */
export const USE_MOCK_PROVIDER = false

/** Fallback poll interval for live data when SSE is quiet (ms). Be conservative. */
export const FALLBACK_POLL_MS = 30_000

/** SSE reconnect backoff bounds (ms). */
export const SSE_RECONNECT_MIN_MS = 2_000
export const SSE_RECONNECT_MAX_MS = 30_000

/** HTTP request timeout (ms). */
export const REQUEST_TIMEOUT_MS = 20_000

/** Map defaults (used by the optional Leaflet route view). */
export const MAP_DEFAULT_CENTER: [number, number] = [48.9914368, 2.277376]
export const MAP_MIN_ZOOM = 7
export const MAP_MAX_ZOOM = 15

export const IMAGE_HOST = 'https://img.aso.fr'

/** Ranking type codes -> human label. */
export const RANKING_TYPE_LABELS: Record<string, string> = {
  ete: 'Stage result',
  etg: 'General classification',
  ice: 'Points (stage)',
  icg: 'Points (overall)',
  ime: 'Mountain (stage)',
  img: 'Mountain (overall)',
  iqe: 'Young rider (stage)',
  iqg: 'Young rider (overall)',
  ite: 'Team (stage)',
  itg: 'Team (overall)',
  ipe: 'Bonus / intermediate (stage)',
  ipg: 'Bonus / intermediate (overall)',
  ije: 'Jersey (stage)',
  ijg: 'Jersey (overall)'
}

/** Stage type codes -> human label. */
export const STAGE_TYPE_LABELS: Record<string, string> = {
  PLN: 'Flat',
  VAL: 'Hilly',
  HMG: 'High mountain',
  PAS: 'Cols / passes',
  EQU: 'Team time trial'
}

/** Climb category code -> label. `X` is an uncategorized côte. */
export const CLIMB_CATEGORY_LABELS: Record<string, string> = {
  HC: 'HC',
  '1': 'Cat 1',
  '2': 'Cat 2',
  '3': 'Cat 3',
  '4': 'Cat 4',
  X: 'Côte'
}

/** Relative "difficulty rank" used to size climb markers (higher = harder). */
export const CLIMB_CATEGORY_RANK: Record<string, number> = {
  HC: 5,
  '1': 4,
  '2': 3,
  '3': 2,
  '4': 1,
  X: 1
}

/** Checkpoint type code -> label. */
export const CHECKPOINT_TYPE_LABELS: Record<string, string> = {
  F: 'Neutral start',
  R: 'Start',
  C: 'Sprint',
  A: 'Finish',
  N: 'Feed zone'
}

/** Jersey ranking codes. */
export const JERSEY_CODES = {
  yellow: 'pmj',
  polkaDot: 'pmm',
  green: 'pmp',
  white: 'pmt'
} as const
