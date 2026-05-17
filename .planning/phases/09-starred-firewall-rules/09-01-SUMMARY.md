---
phase: 09-starred-firewall-rules
plan: "01"
subsystem: firewall-ui
tags: [sqlite, swr, optimistic-update, firewall, starred]
dependency_graph:
  requires: [08-sqlite-snapshot-infrastructure]
  provides: [starred-firewall-rules-api, star-ui-components]
  affects: [firewall-card, firewall-list, db-singleton]
tech_stack:
  added: []
  patterns: [swr-optimistic-mutate, better-sqlite3-singleton, zod-api-validation]
key_files:
  created:
    - src/app/api/firewall/starred/route.ts
    - tests/app/api/firewall/starred/route.test.ts
  modified:
    - src/lib/db/index.ts
    - src/components/firewall/firewall-card.tsx
    - src/components/firewall/firewall-list.tsx
    - tests/components/firewall/firewall-card.test.tsx
    - tests/components/firewall/firewall-list.test.tsx
    - tests/integration/firewall-integration.test.tsx
decisions:
  - Tests placed in tests/ directory (not co-located in src/) to match vitest.config.ts include pattern
  - better-sqlite3 already installed from Phase 8 — no new install needed
  - starred_rules table added to existing getDb() initializer alongside snapshots table
  - INSERT OR REPLACE used for idempotent upsert — prevents duplicate-key errors on double-star
metrics:
  duration_minutes: 18
  completed_date: "2026-05-17"
  tasks_completed: 3
  files_changed: 8
---

# Phase 9 Plan 01: Starred Firewall Rules Summary

**One-liner:** Server-persisted starred firewall rules with optimistic SWR toggle and client-side filter using SQLite INSERT OR REPLACE and lucide-react Star icon.

## What Was Built

### Task 1: SQLite db extension + GET/POST /api/firewall/starred

Extended `src/lib/db/index.ts` to create `starred_rules (rule_id TEXT PRIMARY KEY, starred_at INTEGER NOT NULL)` alongside the existing `snapshots` table — both created at `getDb()` init time with `CREATE TABLE IF NOT EXISTS`.

Created `src/app/api/firewall/starred/route.ts` with two handlers:
- `GET`: session-guarded, queries all rows, returns `{ starredIds: string[] }`
- `POST`: session-guarded, Zod-validated `{ ruleId: string, starred: boolean }`, runs `INSERT OR REPLACE` (star) or `DELETE` (unstar), returns `{ ok: true }`

9 Vitest tests covering all 8 plan behaviors plus empty-string ruleId rejection.

### Task 2: Star UI components

Updated `FirewallCard` with `isStarred: boolean` and `onToggleStar: () => void` props — renders a filled yellow Star when starred, outlined zinc Star when not starred, with a plain `<button>` wrapper for minimal styling.

Updated `FirewallList` with:
- Second SWR call to `/api/firewall/starred` alongside existing `/api/firewall` fetch
- `handleToggleStar()` with optimistic SWR mutate, POST confirmation, revert-on-error
- `showStarredOnly` state toggle button (variant changes default/outline based on state)
- Client-side `visiblePolicies` filter — no extra API call
- Empty starred state: "No starred rules — click ★ on any rule to star it"

Updated `firewall-card.test.tsx` to pass new required props; added 3 star-specific tests.
Rewrote `firewall-list.test.tsx` with 7 tests covering filter toggle, empty state, POST call, and filtered view.

### Task 3: Full test suite + integration fix

Updated `tests/integration/firewall-integration.test.tsx` to pass `isStarred={false} onToggleStar={() => {}}` to the `FirewallCard` call site broken by new required props.

Full suite: 247 total tests — 223 pass, 24 fail (all pre-existing from earlier phases, none introduced by Phase 9).

## Commits

| Hash | Message |
|------|---------|
| `ce0f55b` | feat(09-01): add starred_rules table, GET/POST /api/firewall/starred route |
| `54b1f11` | feat(09-01): star UI — FirewallCard icon and FirewallList filter with optimistic toggle |
| `03c182e` | fix(09-01): update integration test call site for new FirewallCard required props |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test files placed in `tests/` not `src/`**
- **Found during:** Task 1 setup
- **Issue:** Plan specified `src/app/api/firewall/starred/route.test.ts` and `src/components/firewall/firewall-list.test.tsx` as co-located test files. The `vitest.config.ts` `include` pattern is `tests/**/*.test.{ts,tsx}` — co-located tests in `src/` would be silently ignored.
- **Fix:** Created all test files under `tests/` matching the existing project convention.
- **Files modified:** `tests/app/api/firewall/starred/route.test.ts`, `tests/components/firewall/firewall-list.test.tsx`
- **Commit:** `ce0f55b`, `54b1f11`

**2. [Rule 1 - Bug] Integration test FirewallCard call site broke on new required props**
- **Found during:** Task 3 full suite run
- **Issue:** `tests/integration/firewall-integration.test.tsx` rendered `FirewallCard` without `isStarred`/`onToggleStar` — TypeScript error TS2739.
- **Fix:** Added `isStarred={false} onToggleStar={() => {}}` defaults per plan instruction.
- **Files modified:** `tests/integration/firewall-integration.test.tsx`
- **Commit:** `03c182e`

## Pre-existing Test Failures (not introduced by Phase 9)

24 tests across 11 files failing before Phase 9 began:
- `tests/lib/unifi/client.test.ts` — traffic status threshold mismatch (pre-Phase 9)
- `tests/app/api/clients/route.test.ts` — `req.url` undefined in error handler (pre-Phase 9)
- `tests/components/dashboard/client-card-history.test.tsx` — missing `getClientLastBusy` in mock context (pre-Phase 9)
- `tests/components/dashboard/client-list-site-history.test.tsx` — same context mock issue
- `tests/middleware.test.ts`, `tests/app/(dashboard)/layout.test.tsx` — routing path mismatches (pre-Phase 9)
- `tests/app/(dashboard)/firewall/page.test.tsx`, `tests/app/dashboard/page.test.tsx` — component render mismatches (pre-Phase 9)
- `tests/lib/unifi/*.test.ts` — undici `ReadableStream` type incompatibility (pre-Phase 9)

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes beyond what the plan's `<threat_model>` covered:
- `GET /api/firewall/starred` — session-guarded, covered by T-09-02
- `POST /api/firewall/starred` — Zod-validated, session-guarded, parameterized SQL, covered by T-09-01 and T-09-03
- `starred_rules` table — no new trust boundary, uses same `getDb()` singleton as Phase 8

## Known Stubs

None — star state is fully wired: SQLite → API route → SWR → FirewallCard prop.

## Self-Check: PASSED

Files exist:
- `src/app/api/firewall/starred/route.ts` — FOUND
- `src/lib/db/index.ts` (modified) — FOUND
- `src/components/firewall/firewall-card.tsx` (modified) — FOUND
- `src/components/firewall/firewall-list.tsx` (modified) — FOUND
- `tests/app/api/firewall/starred/route.test.ts` — FOUND
- `tests/components/firewall/firewall-card.test.tsx` (modified) — FOUND
- `tests/components/firewall/firewall-list.test.tsx` (modified) — FOUND

Commits exist: `ce0f55b`, `54b1f11`, `03c182e` — all verified in git log.
