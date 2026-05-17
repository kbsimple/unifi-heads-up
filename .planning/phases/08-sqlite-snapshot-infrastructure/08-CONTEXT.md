# Phase 8: SQLite Snapshot Infrastructure - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Add server-side SQLite persistence for per-client bandwidth snapshots. A background interval records download + upload bytes/s per client every 60 seconds. Records older than 30 days are automatically purged. Data persists across server restarts via the SQLite file.

No user-facing UI in this phase — this is the data layer that powers Phase 10 (Insights).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All implementation choices are at Claude's discretion — infrastructure phase. Key decisions to resolve during planning:

- SQLite library: prefer `better-sqlite3` (synchronous, battle-tested, no native addon issues with Next.js standalone) or `@libsql/client` (async, Turso-compatible) — pick what works cleanly in Next.js 15 standalone Docker build
- Background interval: implement as a Node.js singleton module with `setInterval` initialized at import time (works in Next.js App Router since the server process is long-lived in Docker); guard against multiple initializations
- Schema: `snapshots` table with `client_mac TEXT`, `download_bps INTEGER`, `upload_bps INTEGER`, `recorded_at INTEGER` (Unix epoch seconds) — add index on `recorded_at` for purge efficiency
- Purge strategy: run on each snapshot write (delete WHERE recorded_at < now - 30 days) — simple, no separate cron needed
- DB file path: configurable via `SQLITE_PATH` env var, default `./data/snapshots.db`; Docker volume mounts `./data/` for persistence
- Client identifier: use MAC address (already available in `NetworkClient` type) as the stable identifier

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/unifi/index.ts` — `getUnifiClients()` returns `NetworkClient[]` with `mac`, `rxBytesPerSec`, `txBytesPerSec`
- `src/lib/unifi/types.ts` — `NetworkClient` type with all client fields
- `src/lib/unifi/client.ts` — singleton pattern (module-level `agent`) shows established approach for module-level initialization

### Established Patterns
- `server-only` import guard used in lib files — add to any new db module
- Environment variables read inside function bodies (e.g. `baseUrl()`) so tests can mutate `process.env`
- Zod for schema validation at API boundaries

### Integration Points
- New module: `src/lib/db/` — snapshot recorder, db init, purge logic
- Background interval initializer: imported once from `src/lib/db/recorder.ts`, starts on first import
- Phase 10 (Insights) will query this database — design schema with query needs in mind

</code_context>

<specifics>
## Specific Ideas

- Snapshot interval: 60 seconds (confirmed by user)
- Retention: 30 days (confirmed by user)
- Recording trigger: background server-side interval, independent of browser (confirmed by user)
- SQLite chosen over in-memory (confirmed by user — survives restarts)

</specifics>

<deferred>
## Deferred Ideas

- Insights queries and UI — Phase 10
- Exposing snapshot data via API endpoint — Phase 10
- Per-device retention configuration — deferred, not in scope for v3.0

</deferred>
