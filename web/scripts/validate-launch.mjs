/**
 * Post-deploy checks for Contentstack Launch (edge + streaming).
 *
 * Usage:
 *   node scripts/validate-launch.mjs https://your-project.devsampleapp.com
 *
 * Requires a successful Launch deploy with root directory `web`.
 */
const base = (process.argv[2] ?? '').replace(/\/$/, '')
if (!base) {
  console.error('Usage: node scripts/validate-launch.mjs <launch-url>')
  process.exit(1)
}

const checks = []

function pass(name, detail) {
  checks.push({ name, ok: true, detail })
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail })
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
}

async function fetchCheck(path, init) {
  const url = `${base}${path}`
  const res = await fetch(url, init)
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { url, res, body, text }
}

console.log(`\nValidating Launch deploy: ${base}\n`)

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)
if (isLocal) {
  console.log('(local shim — skipping HTML / SSR checks; run against Launch URL for full validation)\n')
}

// --- Edge API ---
try {
  const { res, body } = await fetchCheck('/api/health')
  if (res.status !== 200) fail('GET /api/health status', String(res.status))
  else pass('GET /api/health status', '200')

  const handler = res.headers.get('x-tdf-handler')
  if (handler === 'edge') pass('Edge handler header', 'X-Tdf-Handler: edge')
  else fail('Edge handler header', handler ?? 'missing (API may be hitting Next.js origin)')

  if (body?.handler === 'edge') pass('Health payload', `mock=${body.mock}`)
  else fail('Health payload', JSON.stringify(body).slice(0, 80))
} catch (err) {
  fail('GET /api/health', err instanceof Error ? err.message : String(err))
}

try {
  const { res, body } = await fetchCheck('/api/state')
  if (res.status !== 200) fail('GET /api/state status', String(res.status))
  else pass('GET /api/state status', '200')

  if (body?.connection && Array.isArray(body?.groups)) {
    pass('State shape', `${body.groups.length} groups, connection=${body.connection}`)
  } else fail('State shape', 'unexpected JSON')

  const cache = res.headers.get('cache-control')
  if (cache?.includes('no-store')) pass('API cache header', cache)
  else fail('API cache header', cache ?? 'missing no-store')
} catch (err) {
  fail('GET /api/state', err instanceof Error ? err.message : String(err))
}

// --- SSR page (origin) — Launch only ---
if (!isLocal) {
  try {
    const res = await fetch(`${base}/`, { headers: { Accept: 'text/html' } })
    const html = await res.text()
    if (res.status !== 200) fail('GET / HTML status', String(res.status))
    else pass('GET / HTML status', '200')

    if (html.includes('Tour de France')) pass('Dashboard HTML', 'title/content present')
    else fail('Dashboard HTML', 'expected content missing')

    const encoding = res.headers.get('transfer-encoding')
    const cache = res.headers.get('cache-control')
    if (encoding?.includes('chunked')) {
      pass('SSR transfer encoding', 'chunked (compatible with Launch Streaming mode)')
    } else {
      pass('SSR transfer encoding', encoding ?? 'none — check Launch response mode is Streaming')
    }
    if (cache?.includes('no-store')) pass('Page cache header', cache)
  } catch (err) {
    fail('GET / HTML', err instanceof Error ? err.message : String(err))
  }
}

// --- Edge function deploy signal ---
try {
  const { res, body } = await fetchCheck('/api/does-not-exist')
  if (res.status === 404 && body?.error) pass('Edge 404 routing', 'JSON error from edge router')
  else fail('Edge 404 routing', `status=${res.status}`)
} catch (err) {
  fail('Edge 404 routing', err instanceof Error ? err.message : String(err))
}

const failed = checks.filter((c) => !c.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) {
  console.log('\nTips:')
  console.log('- Confirm Launch root directory is `web` and build succeeded')
  console.log('- Check deployment logs mention Edge Functions deployed')
  console.log('- Response mode: Streaming (Project → Environment → Deploy settings)')
  console.log('- If X-Tdf-Handler is missing, /api/* may not be reaching [proxy].edge.js')
  process.exit(1)
}

console.log('\nLaunch edge + page checks OK.\n')
