# TdF Menu Bar

A macOS menu bar app for following the **Tour de France** live race state, built on the
public Race Center API (`https://racecenter.letour.fr`).

The menu bar shows a compact race summary (e.g. `B +1:24`, `47km`, `Live`). Clicking
the icon opens a floating panel with the current stage, race groups (breakaway / chase /
peloton), gaps, speeds, jersey holders, live commentary, classifications, and the route.

> Personal / private use. It uses **only public, unauthenticated** JSON + SSE endpoints —
> no login, no scraping of private data, no auth bypass. Polling is conservative and data
> is cached locally.

## Stack

- **Electron** (`Tray` menu-bar icon + frameless `BrowserWindow` panel, dock hidden)
- **TypeScript**, strict
- **React 19** + **Vite 7** (via `electron-vite`)
- **Tailwind CSS v4**
- **Zustand** state store
- **eventsource** for SSE in the main process
- **Vitest** for unit tests

All network access (REST + SSE) lives in the **Electron main process**. The renderer only
receives a normalized `LiveRaceState` over IPC, so there are no CORS issues and the UI is
fully decoupled from the messy raw API payloads.

The panel also includes a **Leaflet** route map (ArcGIS dark tiles) with start / chrono /
sprint / finish / summit markers, and clickable **rider** and **team** detail pages.

## Project layout

```
src/
  shared/            types + config shared by main & renderer (no node/electron deps)
  main/
    index.ts         app lifecycle, app.dock.hide(), single instance
    tray.ts          Tray icon + compact title
    panelWindow.ts   frameless popover under the tray icon
    ipc.ts           IPC wiring
    raceCenter/      client, sse, cache, refs, normalizer, provider, types
    tray/            formatTrayTitle + helpers + inlined icon
    mock/            replay provider + fixtures (off-season dev)
  preload/index.ts   contextBridge bridge
  renderer/          React UI (store + components)
docs/                PLAN.md, API-NOTES.md
AGENTS.md            guidance for agents/humans
```

See `docs/PLAN.md` for the phased build plan and `docs/API-NOTES.md` for verified API
shapes and gotchas.

## Setup

Requires Node 20+ (developed on Node 24) and macOS.

```bash
npm install
```

> **Electron binary:** `npm install` normally downloads the Electron binary via a
> postinstall step. If you see `Error: Electron uninstall` when running the app, the
> download was skipped — run it manually once:
>
> ```bash
> node node_modules/electron/install.js
> ```

## Run

```bash
npm run dev      # electron-vite dev (menu-bar app + HMR renderer)
npm run build    # typecheck + production build into out/
npm test         # vitest run (logic unit tests)
npm run typecheck
npm run dist     # package a .app with electron-builder (mac)
```

The app has **no dock icon** — look for the bike-wheel icon and title in the **menu bar**
(top-right). Click it to open the panel. The panel hides when it loses focus.

## Development without a live race

Outside the Tour, the live endpoints (`telemetryPack`, `flashInfoLive`) return empty
arrays, so there's nothing to render. Use the bundled **mock provider**, which replays
fabricated fixtures and slowly closes the gaps so everything animates:

```bash
MOCK=1 npm run dev
```

Or flip `USE_MOCK_PROVIDER` in `src/shared/config.ts`.

## Configuration

`src/shared/config.ts`:

```ts
export const DEFAULT_YEAR = 2026
export const DEFAULT_STAGE = 1
export const USE_MOCK_PROVIDER = false
export const FALLBACK_POLL_MS = 30_000
```

The provider auto-detects the live year (from `/api/millesime`) and the current stage
(from `/api/stage-{year}` dates), so the defaults are only a starting point.

## How it works

1. On start, the main process fetches base data: `millesime`, `stage-{year}`,
   `team-{year}`, `allCompetitors-{year}`.
2. It detects the current year + stage, then fetches per-stage data: the single stage,
   `checkpoint`, `telemetryPack`, `rankingType`, `rankingTypeJerseys`, `flashInfoLive`.
3. It connects to the `/live-stream` SSE endpoint.
4. On each `groups` event it diffs the bind→timestamp map against the local cache and
   fetches only changed binds incrementally (`?from=<lastTimestamp>`), merging by `_id`.
5. Everything is re-normalized into `LiveRaceState`, the tray title is updated, and the
   state is pushed to the renderer.
6. A conservative 30s fallback poll keeps live data fresh if SSE goes quiet.
7. SSE disconnects (`end` event or errors) trigger an exponential-backoff reconnect; the
   UI shows a `reconnecting…` state in the meantime.

## Tray title

`formatTrayTitle` keeps the menu bar text short:

| Situation | Title |
|-----------|-------|
| No live data | `TdF` |
| Reconnecting / loading | `TdF …` |
| Breakaway ahead of bunch | `B +1:24` |
| Multiple groups ahead | `B1 +1:24` |
| All together, distance left | `47km` |
| Live, no gap/distance | `Live` |

## Tests

```bash
npm test
```

Pure logic — refs, cache merge, client detection, the normalizer, the SSE `groups`
parser, and the tray formatter — is covered and runs in plain Node (no Electron needed).

## License

MIT. Not affiliated with ASO / Tour de France. Race Center data © its respective owners.
