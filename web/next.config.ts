import type { NextConfig } from 'next'
import { resolve } from 'node:path'

const nextConfig: NextConfig = {
  // Monorepo: trace files from repo root (shared types live in ../src/shared).
  outputFileTracingRoot: resolve(import.meta.dirname, '..'),

  async rewrites() {
    // Local dev: Next.js has no Launch Edge runtime, so proxy /api to dev-api.mjs.
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:3001/api/:path*'
        }
      ]
    }
    return []
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }]
      }
    ]
  }
}

export default nextConfig
