import type { LiveRaceState } from '@shared/types'
import { getMockState } from './mock-state'

export type EdgeContext = {
  env?: Record<string, string | undefined>
}

const EDGE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  /** Present on Launch edge responses — use to confirm /api/* never hit Next.js origin. */
  'X-Tdf-Handler': 'edge'
} as const

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: EDGE_HEADERS
  })
}

function notFound(): Response {
  return json({ error: 'Not found' }, 404)
}

function resolveState(env?: Record<string, string | undefined>): LiveRaceState {
  // Phase 2: wire RaceProvider when MOCK is unset.
  const useMock = env?.MOCK === '1' || env?.MOCK === 'true' || env?.TDF_MOCK !== '0'
  if (useMock) return getMockState()
  return { ...getMockState(), mock: false }
}

/**
 * HTTP router for /api/* — bundled into functions/lib/race-engine.mjs for Launch Edge.
 * Also used by scripts/dev-api.mjs for local development.
 */
export async function handleApi(request: Request, context: EdgeContext = {}): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api/, '') || '/'

  if (path === '/health' && request.method === 'GET') {
    return json({
      ok: true,
      handler: 'edge',
      mock: resolveState(context.env).mock ?? false,
      ts: new Date().toISOString()
    })
  }

  if (path === '/state' && request.method === 'GET') {
    return json(resolveState(context.env))
  }

  if (path === '/refresh' && request.method === 'POST') {
    const state = resolveState(context.env)
    state.lastUpdated = new Date().toISOString()
    return json(state)
  }

  if (path === '/reconnect' && request.method === 'POST') {
    const state = resolveState(context.env)
    state.connection = 'connected'
    state.lastUpdated = new Date().toISOString()
    return json(state)
  }

  return notFound()
}
