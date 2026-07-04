# TdF Menu Bar — Build Plan

A macOS menu bar (Tray) app that follows the Tour de France live race state using
the public, unauthenticated Race Center API (`https://racecenter.letour.fr`).

Personal use only. No login, no scraping of private data, no auth bypass. Only
public JSON/SSE endpoints. Conservative polling, local cache.

## Guiding principles

- **Main process owns the network.** All Race Center REST + SSE access lives in the
  Electron main process. The renderer only ever receives a fully normalized
  `LiveRaceState` over IPC. This sidesteps CORS and keeps secrets-free network logic
  in one place.
- **Decouple UI from API.** Raw Race Center payloads are messy (numbered-key objects,
  `$ref` strings, nullable fields). We normalize once in main, and the UI consumes
  clean `LiveRaceState` types.
- **Never crash on bad data.** Every endpoint can be empty, archived, half-shaped, or
  fail. Normalizer + client must degrade gracefully and surface a status instead.
- **Logic first, glitter later.** Client + normalizer + tray formatter are built and
  unit-tested before any UI polish.

## Phases

### Phase 0 — Planning & scaffolding ✅ tracked here
- Probe real API shapes (done — see `API-NOTES.md`).
- Write `docs/` + `AGENTS.md`.
- Scaffold: `package.json`, TypeScript, Vite (renderer), Electron build, Tailwind,
  Vitest.

### Phase 1 — Race Center core (logic, fully tested) ⭐ priority
- `raceCenter/types.ts` — raw API types + normalized app types.
- `raceCenter/refs.ts` — `parseRef`, `resolveRef`.
- `raceCenter/cache.ts` — in-memory `BindCache` keyed by bind name, with optional
  disk persistence; merges full + incremental (`?from=`) responses.
- `raceCenter/client.ts` — REST client (`getBind`, `getBindSince`), base-data and
  per-stage fetch helpers, current year/stage detection.
- `raceCenter/normalizer.ts` — build `LiveRaceState` from cached binds.
- `tray/formatTrayTitle.ts` + helpers (`formatSeconds`, `formatDistance`,
  `findPeloton`, `findLeadGroup`).
- **Vitest unit tests** for refs, normalizer, tray formatter, cache merge.

### Phase 2 — Orchestration (main process)
- `raceCenter/sse.ts` — `EventSource` wrapper for `/live-stream` with reconnect,
  parses `uid` / `stage` / `groups` / `message` / `end`.
- `raceCenter/provider.ts` (orchestrator) — bootstrap base data, detect stage,
  fetch per-stage data, react to `groups` events (incremental fetch by bind),
  30s fallback poll, re-normalize, emit state.
- Mock/replay provider (`mock/`) with fixtures so the app is developable off-season.

### Phase 3 — Electron shell
- `main/index.ts` — app lifecycle, `app.dock.hide()`, single instance.
- `main/tray.ts` — `Tray` icon + title, click toggles panel.
- `main/panelWindow.ts` — frameless `BrowserWindow` positioned under the tray icon.
- `main/ipc.ts` — push `LiveRaceState`; handle `refresh` / `reconnect` commands.
- `preload/index.ts` — `contextBridge` API.

### Phase 4 — Renderer UI
- Zustand store fed by IPC.
- Components: `Header`, `GroupList`, `GroupCard`, `LiveCommentary`, `Rankings`,
  `RouteSummary`, `ConnectionStatus`.
- Tailwind dark UI, 380×560 panel.
- (Optional, deferred) Leaflet route map.

### Phase 5 — Polish & docs
- README, mock toggle, error states, verify `npm run dev` / `npm run build`.

## Acceptance criteria mapping

| # | Criterion | Where |
|---|-----------|-------|
| 1 | macOS menu bar app | `main/index.ts`, `tray.ts` |
| 2 | hides dock icon | `app.dock.hide()` in `main/index.ts` |
| 3 | tray icon + compact title | `tray.ts` + `formatTrayTitle` |
| 4 | click opens floating panel | `panelWindow.ts` |
| 5 | fetches stage/rider/team/checkpoint/telemetry | `client.ts` |
| 6 | connects to `/live-stream` | `sse.ts` |
| 7 | reacts to `groups` events | `provider.ts` |
| 8 | normalizes race groups | `normalizer.ts` |
| 9 | updates tray title from live groups | `provider.ts` + `formatTrayTitle` |
| 10 | panel shows stage + group stats | renderer |
| 11 | survives SSE disconnect/reconnect | `sse.ts` |
| 12 | works with empty/not-live endpoints | normalizer + client guards |
| 13 | mock/replay mode | `mock/` + config flag |

## Config (in `src/shared/config.ts`)

```ts
export const DEFAULT_YEAR = 2026
export const DEFAULT_STAGE = 1
export const USE_MOCK_PROVIDER = false
```
