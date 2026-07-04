# AGENTS.md — TdF Menu Bar

Guidance for AI agents and humans working in this repo.

## What this is

A **macOS-first Electron menu bar app** that follows Tour de France live race state
from the public Race Center API (`https://racecenter.letour.fr`). Personal use.

**Hard constraints (do not violate):**
- Public, unauthenticated endpoints only. No login, no auth bypass, no scraping of
  private data.
- Be conservative with polling. Prefer SSE-driven incremental fetches; fallback poll
  is 30s, only for active live data.
- All network access lives in the **Electron main process**. The renderer must never
  call Race Center directly (CORS + separation of concerns).
- The renderer only consumes the normalized `LiveRaceState` type, never raw payloads.

## Architecture

```
src/
  shared/            # types + config shared between main & renderer (no node/electron deps)
    config.ts        # DEFAULT_YEAR, DEFAULT_STAGE, USE_MOCK_PROVIDER, endpoints
    types.ts         # normalized app types (LiveRaceState, RaceGroup, ...) + IPC channels
  main/
    index.ts         # app lifecycle, app.dock.hide(), single instance
    tray.ts          # Tray icon + title
    panelWindow.ts   # frameless BrowserWindow under the tray icon
    ipc.ts           # IPC wiring (push state, handle refresh/reconnect)
    raceCenter/
      types.ts       # RAW Race Center payload types
      refs.ts        # parseRef, resolveRef
      cache.ts       # BindCache, merge full + incremental
      client.ts      # REST client + base/per-stage fetch helpers
      sse.ts         # /live-stream EventSource wrapper w/ reconnect
      normalizer.ts  # raw caches -> LiveRaceState
      provider.ts    # orchestrator: bootstrap, SSE react, poll, emit
    mock/
      mockProvider.ts# replay/mock provider for off-season dev
      fixtures/      # JSON fixtures (esp. telemetryPack groups)
    tray/
      formatTrayTitle.ts  # tray title + formatSeconds/Distance, findPeloton/LeadGroup
  preload/
    index.ts         # contextBridge bridge
  renderer/
    main.tsx, App.tsx
    store/raceStore.ts        # zustand
    components/*.tsx
```

> Note: this layout is a pragmatic expansion of the spec's suggested tree. The spec's
> `main/raceCenter/{client,sse,normalizer,cache,types}.ts` all exist; we added
> `refs.ts`, `provider.ts`, a `shared/` dir, and a `tray/` formatter module.

## Conventions

- TypeScript strict. ESM. Node 24, npm 11.
- Build: `electron-vite` (separate main / preload / renderer builds + Vite dev server).
- Tests: `vitest`. Pure logic (refs, normalizer, cache, tray formatter) must stay free
  of Electron imports so it tests in plain Node.
- Tailwind for styling, dark UI. Panel 380×560.
- Never throw out of the provider loop — log + set connection state instead.

## Commands

```bash
npm install
npm run dev      # electron-vite dev (tray app + HMR renderer)
npm run build    # production build
npm test         # vitest run
npm run typecheck
```

## Dev without a live race

TdF 2026 is not live yet and archived `telemetryPack`/`flashInfoLive` come back empty.
Set `USE_MOCK_PROVIDER = true` in `src/shared/config.ts` (or `MOCK=1 npm run dev`) to
replay fixtures so groups/commentary/tray render.

## Gotchas (see docs/API-NOTES.md for the full list)

- `departureCity`/`arrivalCity` are objects; use `.label`.
- `bib` may be `null`; ranking `position` may be negative/special.
- `checkpoint-*` is one object with numbered string keys.
- `telemetryPack` empty when not live — guard everything.
- First incremental fetch per bind has no `from` → fetch full.

## Status

v0 complete plus follow-ups: all phases (core + tests, orchestration, Electron shell,
renderer UI) implemented per `docs/PLAN.md`. 64 unit tests passing; `npm run build` and
`MOCK=1 npm run dev` verified.

Added after v0:
- Rider & team detail sub-pages (click a rider/team) via on-demand IPC
  (`requestRider`/`requestTeam`) + `buildRiderDetail`/`buildTeamDetail` normalizers.
- Real **Leaflet** route map (`components/RouteMap.tsx`) on ArcGIS dark tiles with
  start/chrono/sprint/finish/summit markers — replaced the inline SVG preview. The
  ArcGIS tile host is allowed in the renderer CSP (`src/renderer/index.html`).
- Tour de France logo in the header (bundled at `src/renderer/assets/`).
- Nicer stage header (formatted date + schedule).
- Renderer console warnings/errors are forwarded to the main log in dev (panelWindow).

Next candidates: live verification during an actual stage, rider GPS dots on the map
(telemetryCompetitor), richer rankings.
