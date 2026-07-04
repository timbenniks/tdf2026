/** Jersey color tokens shared by renderer components and map markers. */

export const JERSEY_HEX: Record<string, string> = {
  yellow: '#ffd400',
  green: '#13a538',
  white: '#f2f2f2',
  polkaDot: '#ffffff'
}

export const JERSEY_LABEL: Record<string, string> = {
  yellow: 'Yellow',
  green: 'Green',
  polkaDot: 'Polka dot',
  white: 'White'
}

export const JERSEY_LABEL_LONG: Record<string, string> = {
  yellow: 'Yellow jersey',
  green: 'Green jersey',
  polkaDot: 'Polka dot jersey',
  white: 'White jersey'
}

export const POLKA_DOT_GRADIENT =
  'radial-gradient(circle at 30% 30%, #e2001a 0 1.4px, #fff 1.4px)'

/** Inline CSS properties for a jersey swatch (handles the polka-dot pattern). */
export function jerseyBackgroundStyle(jersey: string): Record<string, string> {
  if (jersey === 'polkaDot') {
    return { background: POLKA_DOT_GRADIENT, backgroundColor: '#fff' }
  }
  const color = JERSEY_HEX[jersey]
  return color ? { background: color, backgroundColor: color } : {}
}
