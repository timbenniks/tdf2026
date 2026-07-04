import type { ExposedApi } from '@shared/types'

declare global {
  interface Window {
    tdf: ExposedApi
  }
}

export {}
