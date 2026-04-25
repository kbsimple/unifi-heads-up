---
phase: 06-local-api-client
plan: "01"
subsystem: unifi-client-tests
tags: [tests, env-config, undici, tdd, wave-0]
dependency_graph:
  requires: []
  provides: [undici-test-mock, env-contract-update, env-example-template]
  affects: [tests/lib/unifi/client.test.ts, .env.local, .env.local.example]
tech_stack:
  added: []
  patterns: [vi.mock('undici') with Agent+fetch, mockResolvedValue Response shape]
key_files:
  created:
    - .env.local.example
  modified:
    - tests/lib/unifi/client.test.ts
    - .env.local (gitignored — updated locally only)
    - .gitignore (added .env.local.example exception)
decisions:
  - "Wave 0: tests RED against current ky client — intentional, turns GREEN after Plan 02"
  - ".env.local.example added to .gitignore exception (mirrors .env.vercel-mock pattern)"
  - ".env.local is gitignored; only .env.local.example is committed to the repo"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-24"
  tasks_completed: 3
  files_modified: 4
---

# Phase 6 Plan 1: Wave 0 — Test Mock Swap and Env Config Summary

**One-liner:** Swapped client.test.ts from vi.mock('ky') to vi.mock('undici') with Agent+fetch; updated .env.local (UNIFI_HOST in, UNIFI_CONSOLE_ID out); created .env.local.example for contributors and Phase 7 Docker setup.

## What Was Built

Wave 0 infrastructure for Phase 6 undici client migration:

1. **tests/lib/unifi/client.test.ts** — Rewritten to mock `undici` instead of `ky`. Four existing test assertions preserved verbatim. Three new tests added:
   - "creates undici Agent with rejectUnauthorized: false" (LOCAL-02 / T-6-01)
   - "throws when UNIFI_HOST is missing" (D-12 env guard)
   - "sends X-API-KEY header to UNIFI_HOST-based URL" (LOCAL-01 / T-6-04)
   - Tests are intentionally **RED** against the current ky-based client.ts — turns GREEN after Plan 02 ships the undici client.

2. **.env.local** (local only, gitignored) — `UNIFI_CONSOLE_ID` removed, `UNIFI_HOST="192.168.1.1"` added. `UNIFI_MOCK="true"` preserved — mock layer keeps the app runnable end-to-end during the migration.

3. **.env.local.example** (committed) — New file documenting all required env vars for contributors and Phase 7 Docker deployment. Contains placeholders only. `.gitignore` updated to allow it (exception mirrors `.env.vercel-mock`).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 7f98366 | test(06-01): swap ky mock for undici mock in client.test.ts |
| 2+3 | 75aa061 | chore(06-01): create .env.local.example, update .gitignore exception |

## Verification Results

- `npx vitest run tests/lib/unifi/client.test.ts` — **6 FAIL, 1 PASS** (expected RED Wave 0 state)
- `npx vitest run tests/lib/unifi/index.test.ts` — **4 PASS** (facade unchanged, LOCAL-05 green)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Config] Added .gitignore exception for .env.local.example**
- **Found during:** Task 3 commit
- **Issue:** `.gitignore` pattern `.env*` blocked committing `.env.local.example`. Without the exception, the file would exist locally but never be tracked in git — defeating D-07's intent of providing a documented template for contributors.
- **Fix:** Added `!.env.local.example` exception to `.gitignore`, mirroring the existing `!.env.vercel-mock` pattern already in the file.
- **Files modified:** `.gitignore`
- **Commit:** 75aa061

**2. [Rule 3 - Blocking] Tasks 2 and 3 committed together**
- **Found during:** Task 2 commit
- **Issue:** `.env.local` is gitignored (correct — it contains real secrets). The Task 2 env change is a local-only update; only `.env.local.example` and the `.gitignore` exception are committed.
- **Fix:** Combined Tasks 2 and 3 into one commit (75aa061) since .env.local.example and .gitignore are the only committable artifacts from both tasks.

## Known Stubs

None — this plan produces only test infrastructure and env config files, no UI components or data-wiring stubs.

## Threat Flags

No new security-relevant surface introduced. `.env.local.example` contains placeholders only (verified: no `$2b$10$` bcrypt hashes, no real API key values). T-6-01 through T-6-04 mitigations from the plan's threat model are in place as test assertions.

## Self-Check: PASSED

- tests/lib/unifi/client.test.ts: FOUND
- .env.local.example: FOUND
- Commit 7f98366: FOUND
- Commit 75aa061: FOUND
