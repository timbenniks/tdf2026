# Race Center API — verified notes

Base URL: `https://racecenter.letour.fr`. No auth needed for reads. JSON over REST,
plus an SSE stream at `/live-stream`.

These notes record what was **verified against the live API** (June 2026, off-season)
so the normalizer matches reality, not just the spec.

## General payload conventions

- Most collection endpoints return a **JSON array** of records.
- `/api/stage-{year}/{stageNum}` returns an **array of one** item.
- Every record carries metadata fields we ignore for the UI: `_bind`, `_id`, `_key`,
  `_origin`, `_parent`, `_updatedAt`, `_virtual`, `_gets`.
- Refs are strings: `"$team": "team-2025:<docId>"`, `"$rider": "allCompetitors-2025:<docId>"`.
  Resolve the part after `:` against the target collection's `_id`.
- `_gets` lists which fields are refs, e.g. `{"team": "$team"}`.

## Endpoint shapes (verified)

### `/api/millesime`
Array of editions. Fields seen: `year`, `isLive`, `jerseys`, `jerseys_sm`,
`timezone`, `maxAltitude`, `skale`, `hideCaravan`, `hideRadio`. Jerseys is a map of
ranking-type code → image URL (`pmj`, `pmm`, `pmp`, `pmt`, `etg`, `icg`, ...).

### `/api/stage-{year}` and `/api/stage-{year}/{stageNum}`
Fields: `stage` (number), `id` (DB id, NOT stage number), `date`, `type`,
`departureCity`, `arrivalCity`, `length` (number, km), `lengthDisplay` (number here,
treat as number|string), `startTime`, `endTime`, `timezone`, `showGroups`,
`isCancelled`, `podiumDisplayMode`.

> ⚠️ **`departureCity` / `arrivalCity` are OBJECTS, not strings.** City name is in
> `.label`. Shape: `{ cityLangs, code, content, id, label }`. Use `.label`.

### `/api/team-{year}`
Fields: `code`, `name`, `nameShort`, `nationality`, `color` (hex), `logo`,
`logo_live`, `jersey`, `jersey_sm`, `banner`, `header`. Ref target = `_id`.

### `/api/allCompetitors-{year}`
Fields: `firstname`, `lastname`, `lastnameshort`, `nationality`, `birthdate`,
`idUCI`, `UCICode`, `bib` (number **or null**), `sex`, `profile`, `profile_sm`,
`profile_podium_live`, `$team`, `_gets`, `victories`, `podiums`. Ref target = `_id`.

> ⚠️ `bib` can be `null` (e.g. non-starters). Handle missing bibs.
> ⚠️ `victories` / `podiums` are **numbers**. `nationality` is a lowercase code (`slo`).
> ⚠️ On live day 1 of 2026, `allCompetitors-2026` returned **204 No Content** — the rider
> directory is published later, so groups show bib numbers and rider detail pages are
> empty until then. Everything must degrade gracefully.

### `/api/checkpoint-{year}-{stageNum}`
Array of one object with **numbered string keys** (`"0"`, `"1"`, ...) plus metadata
keys. Each numbered entry: `checkpoint` (number), `latitude`, `longitude`, `length`,
`checkpointTypes` (array), `checkpointSummits` (array), `country`, `countryCode`,
`place`, `road`, schedules. Iterate numeric keys in numeric order to build the route.

> ⚠️ **`checkpointTypes` items are OBJECTS, not strings** (verified 2026-1):
> `{ type: "fictive", id, number, code: "F" }`. Use `.code` for the short letter,
> else the UI prints `[object Object]`. Codes: `F` fictive start, `R` real start,
> `N` sprint, `C` chrono, `A` arrival. Use `place`/`road` for human checkpoint names.
> `checkpointSummits[]` items: `{ summit: { name, altitude }, length (m), state (gradient %, as string), code (category) }`.

### `/api/rankingType-{year}-{stageNum}` & `/api/rankingTypeJerseys-{year}-{stageNum}`
Fields: `type` (code), `status`, `checkpoint`, `length`, `rankings` (array), `types`,
`timeLimit`, `firstCompetitorTime`. Each ranking item:
`{ position, bib, absolute (ms), relative (ms gap), bonus, penality, $rider }`.

> ⚠️ `position` can be negative/special (saw `-4`) for non-classified states. Filter.

### `/api/flashInfoLive-{year}-{stageNum}`
Live text commentary. **Empty array off-season / before live.**

### `/api/telemetryPack-{year}-{stageNum}`
THE source for the menu bar. `{ date, type, groups[] }`. Each group:
`name`, `bibs[]`, `latitude`, `longitude`, `size`, `speed` (km/h), `relative`
(seconds gap to leader), `secGapToPrev`, `computedRemainingDistance`,
`completedDistance`, `hasYellowJersey`, `hasGreenJersey`, `hasPolkaDotJersey`,
`hasWhiteJersey`, `localization`.

> ⚠️ **Empty (`[]`) for archived past stages and off-season.** This is why a mock
> provider is mandatory for development right now (TdF 2026 not yet live).

### `/api/telemetryCompetitor-{year}`
Per-rider GPS. `{ RaceStatus, RaceName, TimeStamp (s), StageId, YGPW, Riders[] }`.
Active during race only.

### `/api/event`, `/api/social`, `/api/vehicles-{year}-{stageNum}`
`event`: `adUnit`, `extras` (radioUrl, hideInsideRace). `social`/`vehicles` usually
empty outside live race.

## Incremental fetches

`GET /api/{bindName}?from={unixMs}` returns only records updated after the timestamp.
First fetch for a bind has no previous timestamp → fetch full (no `from`). Merge
incremental records into the cached array (replace by `_id`).

## SSE `/live-stream`

Events: `uid` (client id), `stage` (active stage hash), `groups` (JSON map of
bindName → latest update ms), `message` (keepalive), `end` (reconnect).

`groups` example:
```json
{ "team-2026": 1782383123533, "telemetryPack-2026-1": 1782383124000 }
```
On each `groups`, compare per-bind timestamp vs local cache; fetch changed binds
incrementally; re-normalize; update tray + push to renderer. On `end`, reconnect.

## Ranking type codes
`ete` stage result · `etg` GC · `ice` points stage · `icg` points overall ·
`ime` mountain stage · `img` mountain overall · `iqe` young stage · `iqg` young overall ·
`ite` team stage · `itg` team overall · `ipe`/`ipg` bonus/intermediate · `ije`/`ijg` jersey.

## Stage type codes
`PLN` flat · `VAL` hilly · `HMG` high mountain · `PAS` cols/passes · `EQU` team TT.

## Jersey ranking codes
`pmj` yellow · `pmm` polka dot · `pmp` green · `pmt` white.
