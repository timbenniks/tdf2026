import * as esbuild from 'esbuild'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const outfile = resolve(root, 'functions/lib/race-engine.mjs')

await mkdir(dirname(outfile), { recursive: true })

await esbuild.build({
  entryPoints: [resolve(root, 'src/engine/edge-handlers.ts')],
  outfile,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  bundle: true,
  minify: true,
  alias: {
    '@shared': resolve(root, '../src/shared')
  },
  logLevel: 'info'
})

const { size } = await import('node:fs/promises').then((fs) => fs.stat(outfile))
console.log(`Edge bundle: ${outfile} (${(size / 1024).toFixed(1)} KiB)`)
