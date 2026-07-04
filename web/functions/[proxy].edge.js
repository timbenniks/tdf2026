import { handleApi } from './lib/race-engine.mjs'

const RSC_HEADER = 'rsc'
const RSC_HEADER_VALUE = '1'
const RSC_QUERY_PARAM = '_rsc'

/**
 * Strip stray RSC headers on document navigations (Contentstack Launch quirk).
 * @see https://www.contentstack.com/docs/launch/handling-nextjs-rsc-issues-on-launch
 */
function fixRscHeader(request, url) {
  const rscQuery = url.searchParams.has(RSC_QUERY_PARAM)
  const rscHeader = request.headers.get(RSC_HEADER) === RSC_HEADER_VALUE
  if (rscHeader && !rscQuery) {
    const modified = new Request(request)
    modified.headers.delete(RSC_HEADER)
    return modified
  }
  return request
}

/**
 * Launch Edge Function entry point.
 * - /api/*  → race engine (never hits Next.js origin)
 * - else    → Next.js origin (pages, _next, assets)
 */
export default async function handler(request, context) {
  let req = request
  const url = new URL(request.url)

  req = fixRscHeader(req, url)

  if (url.pathname.startsWith('/api/')) {
    return handleApi(req, context)
  }

  return fetch(req)
}
