---
phase: "05-dev-mock-layer"
plan: "05-02"
subsystem: "unifi-client"
tags: [testing, mock, vitest, facade]
dependency_graph:
  requires: ["05-01"]
  provides: [mock-unit-tests, facade-smoke-test, repaired-route-tests]
  affects: [tests/lib/unifi/mock.test.ts, tests/lib/unifi/index.test.ts, tests/app/api/clients/route.test.ts, tests/app/api/firewall/route.test.ts]
tech_stack:
  added: []
  patterns: [self-contained-toggle-tests, vi-mock-hoisting, module-level-state-test-isolation]
key_files:
  created:
    - tests/lib/unifi/mock.test.ts
    - tests/lib/unifi/index.test.ts
  modified:
    - tests/app/api/clients/route.test.ts
    - tests/app/api/firewall/route.test.ts
decisions:
  - "Toggle tests are self-contained: read current state, flip, assert, restore — avoids beforeEach reset complexity and satisfies T-05-04"
  - "index.test.ts uses vi.mock hoisting for server-only and both client/mock modules to prevent real ky and env-var access in test env (T-05-05)"
  - "UNIFI_MOCK=true branch not tested via module reload — complexity not justified; end-to-end coverage via dev.sh is sufficient"
metrics:
  duration: "~8 minutes"
  completed_date: "2026-04-19"
  tasks_completed: 2
  files_changed: 4
requirements_addressed: [MOCK-01, MOCK-02, MOCK-04, MOCK-05, MOCK-06, MOCK-07, MOCK-08]
---

# Phase 05 Plan 02: Mock Layer Tests Summary

**One-liner:** Vitest unit tests for mock.ts (11 tests) and facade index.ts (4 smoke tests), plus repaired route test vi.mock targets from @/lib/unifi/client to @/lib/unifi.

## What Was Built

- **tests/lib/unifi/mock.test.ts** — 11 tests across 4 describe blocks covering all MOCK-04 through MOCK-08 requirements: client count (>=6), timestamp validity, per-field validation (displayName, mac pattern, ip, rates >=0), all-four-status coverage, policy count (>=3), mixed enabled states, mutation isolation (shallow copy verification), toggle persistence, toggle self-containment (read/flip/assert/restore), not-found error, and isZoneBasedFirewallEnabled returns false.

- **tests/lib/unifi/index.test.ts** — 4 smoke tests verifying the facade exports four callable functions and that each returns the expected promise shape. vi.mock hoisting prevents real ky/env access (T-05-05 mitigation).

- **tests/app/api/clients/route.test.ts** — vi.mock target changed from `@/lib/unifi/client` to `@/lib/unifi`; import line updated to match. All 4 existing assertions continue to pass.

- **tests/app/api/firewall/route.test.ts** — same two-line repair. All 9 existing assertions (GET + PUT) continue to pass.

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| tests/lib/unifi/mock.test.ts | 11 | Passed |
| tests/lib/unifi/index.test.ts | 4 | Passed |
| tests/app/api/clients/route.test.ts | 4 | Passed |
| tests/app/api/firewall/route.test.ts | 9 | Passed |
| Other pre-existing suites | 128 | Passed |
| Pre-existing unrelated failures | 3 | Failed (out of scope — dashboard/firewall page tests referencing non-existent file paths, unchanged from before this plan) |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | f7fc1ac | test(05-02): add mock.test.ts covering MOCK-04 through MOCK-08 |
| 2 | 8764d06 | test(05-02): add index facade smoke test and repair route vi.mock targets |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Test files are fully wired to the modules under test.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- [x] tests/lib/unifi/mock.test.ts exists — verified (f7fc1ac)
- [x] tests/lib/unifi/index.test.ts exists — verified (8764d06)
- [x] tests/app/api/clients/route.test.ts mocks @/lib/unifi (not @/lib/unifi/client) — grep confirmed
- [x] tests/app/api/firewall/route.test.ts mocks @/lib/unifi (not @/lib/unifi/client) — grep confirmed
- [x] npm run test:run: 28 suites passed (up from 24), 155 tests passed, 3 pre-existing unrelated failures unchanged
- [x] Commit f7fc1ac exists — mock.test.ts
- [x] Commit 8764d06 exists — index.test.ts + route repairs
