---
phase: 10-insights-page
plan: "01"
subsystem: insights-api
tags: [sqlite, api-routes, tdd, insights]
dependency_graph:
  requires: [src/lib/db/index.ts, src/lib/session.ts]
  provides: [src/lib/insights/queries.ts, GET /api/insights/top-devices, GET /api/insights/device-activity]
  affects: [Plan 10-03 client components]
tech_stack:
  added: []
  patterns: [better-sqlite3 in-memory tests, parameterised SQL, server-only guard]
key_files:
  created:
    - src/lib/insights/queries.ts
    - src/lib/insights/queries.test.ts
    - src/app/api/insights/top-devices/route.ts
    - src/app/api/insights/device-activity/route.ts
  modified:
    - vitest.config.ts
decisions:
  - SQL adapted to actual schema columns (client_mac, download_bps, upload_bps) not plan-assumed names
  - Extended vitest include pattern to cover src/**/*.test.ts for co-located tests
metrics:
  duration: ~10 minutes
  completed: 2026-05-16
  tasks: 2
  files: 5
---

# Phase 10 Plan 01: Insights API Routes Summary

SQLite-backed insights API with two authenticated GET endpoints and a fully TDD-tested query module.

## What Was Built

- `queryTopDevices(db, days)` — ranks devices by SUM(download_bps + upload_bps) DESC, LIMIT 20, within days window
- `queryDeviceActivity(db, mac, days)` — returns exactly 24 hourly buckets, filling missing hours with avgMbps=0/active=false
- `GET /api/insights/top-devices?days=7|14|30` — session-gated, days allowlist validation, 400/401/500 error handling
- `GET /api/insights/device-activity?mac=XX&days=7|14|30` — session-gated, mac + days validation
- Both routes use `import 'server-only'` and parameterised SQL bindings

## Test Results

12/12 Vitest tests pass (TDD RED → GREEN cycle confirmed).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Schema column names differ from plan**
- **Found during:** Task 1
- **Issue:** Plan assumed `mac`, `rx_bytes`, `tx_bytes` columns; actual Phase 8 schema uses `client_mac`, `download_bps`, `upload_bps`
- **Fix:** Updated all SQL in queries.ts and test fixtures to use the real column names
- **Files modified:** src/lib/insights/queries.ts, src/lib/insights/queries.test.ts
- **Commit:** 63a3318

**2. [Rule 3 - Blocking] Vitest only scanned tests/ directory**
- **Found during:** Task 1 (RED phase)
- **Issue:** vitest.config.ts `include` pattern was `tests/**/*.test.ts` only; queries.test.ts at src/lib/insights/ was not found
- **Fix:** Extended include to `['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}']`
- **Files modified:** vitest.config.ts
- **Commit:** 63a3318

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 (TDD) | 63a3318 | feat(10-01): add insights query module with unit tests |
| Task 2 (routes) | 8c9ea03 | feat(10-01): add insights API routes |

## Self-Check: PASSED
