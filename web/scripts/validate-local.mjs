/**
 * Pre-deploy checks — same API contract as Launch, via dev-api shim.
 * Run after: npm run build:edge && node scripts/dev-api.mjs (in another terminal)
 *
 * Or: npm run validate:local (starts dev-api briefly)
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 3001
const base = `http://127.0.0.1:${PORT}`

let child
let startedHere = false

async function ensureDevApi() {
  try {
    const res = await fetch(`${base}/api/health`)
    if (res.ok) {
      console.log('[validate-local] reusing dev-api on port 3001')
      return
    }
  } catch {
    // start below
  }
  startedHere = true
  child = spawn('node', ['scripts/dev-api.mjs'], {
    cwd: new URL('..', import.meta.url).pathname,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  for (let i = 0; i < 20; i++) {
    await sleep(200)
    try {
      const res = await fetch(`${base}/api/health`)
      if (res.ok) return
    } catch {
      // retry
    }
  }
  throw new Error('dev-api did not start on port 3001')
}

try {
  await ensureDevApi()
  const args = ['scripts/validate-launch.mjs', base]
  const v = spawn('node', args, { stdio: 'inherit', cwd: new URL('..', import.meta.url).pathname })
  const code = await new Promise((resolve) => v.on('close', resolve))
  process.exit(code ?? 1)
} finally {
  if (startedHere && child) child.kill()
}
