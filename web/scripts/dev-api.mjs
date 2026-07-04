/**
 * Local stand-in for Launch Edge Functions during `npm run dev`.
 * Serves the same handleApi() the edge bundle exports.
 */
import { createServer } from 'node:http'

const PORT = Number(process.env.TDF_DEV_API_PORT ?? 3001)
const HOST = '127.0.0.1'
const env = {
  MOCK: process.env.MOCK ?? '1',
  TDF_MOCK: process.env.TDF_MOCK ?? '1'
}

async function isOurDevApi() {
  try {
    const res = await fetch(`http://${HOST}:${PORT}/api/health`)
    if (!res.ok) return false
    const body = await res.json()
    return body?.handler === 'edge'
  } catch {
    return false
  }
}

async function startServer() {
  const { handleApi } = await import('../functions/lib/race-engine.mjs')

  const server = createServer(async (req, res) => {
    const host = req.headers.host ?? `${HOST}:${PORT}`
    const url = `http://${host}${req.url ?? '/'}`
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    }

    const body =
      req.method !== 'GET' && req.method !== 'HEAD'
        ? await new Promise((resolve, reject) => {
            const chunks = []
            req.on('data', (c) => chunks.push(c))
            req.on('end', () => resolve(Buffer.concat(chunks)))
            req.on('error', reject)
          })
        : undefined

    const request = new Request(url, {
      method: req.method,
      headers,
      body: body?.length ? body : undefined
    })

    try {
      const response = await handleApi(request, { env })
      res.statusCode = response.status
      response.headers.forEach((value, key) => res.setHeader(key, value))
      const text = await response.text()
      res.end(text)
    } catch (err) {
      console.error('[dev-api]', err)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(PORT, HOST, () => {
      server.off('error', reject)
      resolve(undefined)
    })
  })

  console.log(`[dev-api] http://${HOST}:${PORT}/api/state (MOCK=${env.MOCK})`)
}

async function reuseExisting() {
  console.log(`[dev-api] port ${PORT} already in use — reusing existing dev-api`)
  // Keep this process alive so concurrently does not kill next dev.
  await new Promise(() => {})
}

async function main() {
  try {
    await startServer()
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined
    if (code === 'EADDRINUSE') {
      if (await isOurDevApi()) {
        await reuseExisting()
        return
      }
      console.error(
        `[dev-api] port ${PORT} is in use by another process.\n` +
          `  Free it:  lsof -ti:${PORT} | xargs kill\n` +
          `  Or use:   TDF_DEV_API_PORT=3002 npm run dev  (and update next.config.ts rewrite port)`
      )
      process.exit(1)
    }
    throw err
  }
}

void main()
