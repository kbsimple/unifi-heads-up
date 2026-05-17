---
phase: 08-sqlite-snapshot-infrastructure
plan: "01"
subsystem: data-layer
tags: [sqlite, background-recorder, instrumentation, persistence]
dependency_graph:
  requires: []
  provides: [snapshot-db, recorder-singleton, instrumentation-hook]
  affects: [phase-10-insights]
tech_stack:
  added: [better-sqlite3]
  patterns: [singleton-module, server-only-guard, tdd-red-green]
key_files:
  created:
    - src/lib/db/index.ts
    - src/lib/db/recorder.ts
    - src/instrumentation.ts
    - tests/lib/db/db.test.ts
    - tests/lib/db/recorder.test.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "better-sqlite3 chosen over @libsql/client — synchronous API simpler for background recorder, no async complexity"
  - "purgeOldSnapshots() called inline after each insertSnapshots() — no separate cron needed"
  - "instrumentation.ts uses dynamic import of recorder to avoid circular init issues at Next.js boot"
metrics:
  duration_minutes: 65
  completed_date: "2026-05-17"
  tasks_completed: 3
  files_created: 5
  files_modified: 2
---

# Phase 8 Plan 01: SQLite Snapshot Infrastructure Summary

**One-liner:** SQLite snapshot recorder using better-sqlite3 with 60s interval, 30-day auto-purge, and Next.js instrumentation hook for server-boot initialization.

## What Was Built

Three new server-only modules implement the full data persistence layer for Phase 10 Insights:

1. **`src/lib/db/index.ts`** — DB init, schema creation, batch insert, and purge. `getDb()` is a module-level singleton that creates `./data/snapshots.db` (or `SQLITE_PATH`) with the `snapshots` table and `idx_recorded_at` index on first call. `insertSnapshots()` wraps rows in a `db.transaction()` for atomic batch efficiency and calls `purgeOldSnapshots()` after each write. `purgeOldSnapshots()` deletes rows where `recorded_at < now - 30 days`.

2. **`src/lib/db/recorder.ts`** — Background polling singleton. `startRecorder()` creates a `setInterval` at 60,000 ms. A module-level `started` boolean guards against double-initialization. Each tick calls `getUnifiClients()` then `insertSnapshots()`, wrapping the entire async block in try/catch so errors are logged but never crash the interval.

3. **`src/instrumentation.ts`** — Next.js `register()` hook. Guards with `process.env.NEXT_RUNTIME === 'nodejs'` to skip Edge Runtime, then dynamically imports and calls `startRecorder()`. Dynamic import avoids circular module init issues at Next.js process boot.

## Tests

14 new test cases across two files:

- `tests/lib/db/db.test.ts` (10 tests) — covers singleton behavior, table/index creation, correct insert values, empty-array no-op, purge-on-insert integration, purge boundary conditions.
- `tests/lib/db/recorder.test.ts` (4 tests) — covers 60s tick behavior, singleton guard (double-call no-op), error swallowing with console.error logging, interval resilience after transient errors.

All 14 new tests pass. 11 pre-existing test files fail (unrelated to this plan — failures confirmed present before any changes).

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `better-sqlite3` over `@libsql/client` | Synchronous API; simpler integration with Next.js server process; no async complexity in background interval |
| Inline purge after insert | Keeps retention enforcement close to the write path; avoids need for a separate cron job |
| Dynamic import in instrumentation.ts | Avoids circular init issues during Next.js module graph resolution at boot |
| `SQLITE_PATH` env var read inside `getDb()` body | Consistent with project pattern (env vars in function bodies so tests can mutate `process.env`) |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this is a data layer module. No UI stubs introduced.

## Threat Flags

None — all new modules are `server-only`, DB path is not `NEXT_PUBLIC_` prefixed, SQL uses prepared statements with positional parameters (no interpolation). Threat register entries T-08-01 through T-08-05 are addressed as designed.

## Self-Check: PASSED

All created files verified on disk. All task commits verified in git history.

| Item | Status |
|------|--------|
| src/lib/db/index.ts | FOUND |
| src/lib/db/recorder.ts | FOUND |
| src/instrumentation.ts | FOUND |
| tests/lib/db/db.test.ts | FOUND |
| tests/lib/db/recorder.test.ts | FOUND |
| commit 1ba0410 (Task 1) | FOUND |
| commit 3182091 (Task 2) | FOUND |
