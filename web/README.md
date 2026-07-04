# TdF Web Dashboard (Contentstack Launch)

Personal Tour de France dashboard hosted on [Contentstack Launch](https://www.contentstack.com/docs/launch). Uses **Next.js** for the UI and **Launch Edge Functions** (`functions/[proxy].edge.js`) for all `/api/*` traffic — no Next.js API routes.

The Electron menu bar app lives in the repo root; this folder is a **separate deploy target**.

## How the repo is split

```
timbenniks-tdf-2026/
├── src/shared/          ← shared types & config (both apps import this)
├── src/main/            ← Electron main process + race engine (menu bar only)
├── src/renderer/        ← Electron panel UI (menu bar only)
├── web/                 ← THIS PROJECT — Launch deploy root
│   ├── functions/       ← Launch Edge Functions (deployed to CDN edge)
│   ├── src/app/         ← Next.js App Router pages
│   ├── src/engine/      ← API logic, bundled for edge
│   └── scripts/         ← build & local dev helpers
└── package.json         ← Electron app (`npm run dev`)
```

| Command | Where | What it builds |
|---------|-------|----------------|
| `npm run dev` | repo root | Electron menu bar app |
| `npm run dev:web` | repo root | Next.js + local API shim |
| `cd web && npm run build` | `web/` | Edge bundle + Next.js production build |

## Local development

Launch Edge Functions don't run inside `next dev`, so local dev uses a small Node shim that serves the **same bundled** `handleApi()` the edge uses:

```
Browser → Next.js :3000  →  rewrite /api/*  →  dev-api.mjs :3001  →  race-engine.mjs
```

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000 — the dashboard fetches mock data from `/api/state`.

Set `MOCK=0` to exercise the live path once Phase 2 wires Race Center (still returns mock until then).

## Production build

```bash
cd web
npm run build
```

This runs two steps:

1. **`npm run build:edge`** — esbuild bundles `src/engine/` → `functions/lib/race-engine.mjs` (WinterCG-safe, <1 MiB)
2. **`next build`** — static + server pages for Next.js origin

On Launch, `/api/*` is handled at the **edge** before traffic reaches Next.js. Pages and assets go to the Next.js origin.

## Deploying to Contentstack Launch

1. Create a Launch project from this GitHub repo
2. Set **root directory** to `web`
3. Framework preset: **Next.js (App Router)**
4. Response mode: **Streaming**
5. Build command: `npm run build`
6. Environment variables (optional):
   - `MOCK=1` — mock fixtures (off-season dev)
   - `TDF_AUTH_TOKEN` — bearer token for API auth (Phase 5)

Launch auto-deploys `functions/[proxy].edge.js` alongside the site.

## API endpoints (Phase 1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/state` | Current `LiveRaceState` snapshot |
| POST | `/api/refresh` | Force refresh, return snapshot |
| POST | `/api/reconnect` | Reset connection, return snapshot |

Phase 4 adds `GET /api/state/stream` (SSE).

## Validating edge + streaming

Launch Edge Functions **cannot run locally** — only on Launch after deploy. Use a two-step validation flow.

### Step 1 — Local (before deploy)

Confirms the edge bundle and API contract match what Launch will run:

```bash
cd web
npm run validate:local
```

This builds `race-engine.mjs`, starts the dev-api shim, and checks `/api/health` + `/api/state`.

For the full UI locally:

```bash
npm run dev
# open http://localhost:3000 — groups should load from mock API
```

### Step 2 — Launch dev environment (after deploy)

1. Deploy to a **dev/staging** Launch environment (not production first)
2. In deployment logs, confirm edge functions deployed (no bundling errors, no `CFL-0001`)
3. Set **Response mode → Streaming** in environment deploy settings
4. Set env `MOCK=1`
5. Run:

```bash
npm run validate:launch -- https://your-project.devsampleapp.com
```

**What to look for:**

| Check | Pass | Fail means |
|-------|------|------------|
| `X-Tdf-Handler: edge` on `/api/*` | Edge function handled the request | `/api` hitting Next.js origin or 404 |
| `GET /api/health` → `{ handler: "edge" }` | Router + bundle OK | Edge deploy or import path broken |
| `Cache-Control: no-store` on API | Live data won't CDN-cache | Misconfigured headers |
| HTML `Transfer-Encoding: chunked` | Streaming mode likely active | Buffered mode, or static page |
| Dashboard shows groups in browser | End-to-end UI + API | CORS, rewrite, or client bug |

**Manual streaming check** (optional):

```bash
curl -N -D - -o /dev/null -H "Accept: text/html" https://your-project.devsampleapp.com/
```

Look for `transfer-encoding: chunked` in response headers. Compare with **Buffered** response mode toggled off/on in Launch settings — Streaming should start sending bytes sooner under slow SSR (subtle on a tiny page).

**Launch dashboard checks:**

- **Server logs** — edge `console.log` output (24h retention)
- **Deployment info** — lists Cloud / Edge Functions endpoints
- If edge errors: look for `CFL-0001` ([troubleshooting](https://www.contentstack.com/docs/developers/launch/troubleshooting-launch-response-error-codes))

### Step 3 — SSE streaming (Phase 4)

Once `/api/state/stream` exists:

```bash
curl -N -H "Accept: text/event-stream" https://your-site.com/api/state/stream
```

Should hold the connection and emit `event: state` chunks. Edge functions have **no timeout while the client stays connected**.

## Next phases

- **Phase 2** — Port `RaceProvider` into `src/engine/`, real Race Center fetches
- **Phase 3** — Migrate renderer components from `src/renderer/components/`
- **Phase 4** — SSE stream at edge (`/api/state/stream`)
- **Phase 5** — Auth, schedule/rider/team views
