---
phase: "05-dev-mock-layer"
plan: "05-01"
subsystem: "unifi-client"
tags: [mock, dev-tooling, facade, unifi-client]
dependency_graph:
  requires: []
  provides: [mock-unifi-client, client-facade]
  affects: [api-clients-route, api-firewall-route, dev-sh]
tech_stack:
  added: []
  patterns: [module-level-mutable-state, conditional-re-export-facade, server-only-guard]
key_files:
  created:
    - src/lib/unifi/mock.ts
    - src/lib/unifi/index.ts
  modified:
    - src/app/api/clients/route.ts
    - src/app/api/firewall/route.ts
    - dev.sh
decisions:
  - "Facade (index.ts) evaluates UNIFI_MOCK once at module init, not per-request — server restart required to flip mode (intentional)"
  - "mock.ts has no server-only import — the server boundary is enforced by index.ts which imports both"
  - "In-memory firewall toggle state uses module-level let variable — resets on HMR/server restart (intentional per MOCK-05)"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-04-19"
  tasks_completed: 2
  files_changed: 5
requirements_addressed: [MOCK-01, MOCK-02, MOCK-03, MOCK-04, MOCK-05, MOCK-06, MOCK-07, MOCK-08]
---

# Phase 05 Plan 01: Dev Mock Layer Summary

**One-liner:** Module-level UNIFI_MOCK facade with 6-client mock data and in-memory firewall toggle state, wired via dev.sh.

## What Was Built

A two-file mock layer for local development without a real UniFi console:

- **src/lib/unifi/mock.ts** — hardcoded 6 NetworkClient entries spanning all four traffic bands (high/medium/low x2/idle x2 as combined), 3 FirewallPolicy entries with mixed enabled state, and 4 exported async functions matching client.ts signatures exactly. Module-level `let mockPolicies` enables in-memory toggle persistence across page refreshes within a dev session.

- **src/lib/unifi/index.ts** — 15-line facade that imports `server-only`, then conditionally assigns `impl` to either `mock` or `real` based on `process.env.UNIFI_MOCK === 'true'`, and re-exports the 4 named functions.

- **Route updates** — both `src/app/api/clients/route.ts` and `src/app/api/firewall/route.ts` now import from `@/lib/unifi` (the facade) instead of `@/lib/unifi/client` directly.

- **dev.sh** — `export UNIFI_MOCK=true` added before `npm run dev`, so the full app runs in mock mode by default with no credentials required.

## Mock Data Reference

| Client | Traffic | Combined bytes/s | Mbps |
|--------|---------|-----------------|------|
| MacBook Pro (Work) | high | 17,000,000 | 136 |
| Smart TV | medium | 2,050,000 | 16.4 |
| Dad's iPhone | low | 600,000 | 4.8 |
| Mom's iPad | low | 380,000 | 3.0 |
| Ring Doorbell | idle | 0 | 0 |
| Nintendo Switch | medium | 4,500,000 | 36 |

| Policy | Enabled |
|--------|---------|
| Block Gaming Consoles | true |
| Pause Kids Devices | false |
| Guest Network Restrict | true |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 5586f7c | feat(05-01): create mock UniFi client with 6 clients and 3 firewall policies |
| 2 | 290954a | feat(05-01): add facade switcher, update API routes and dev.sh for mock mode |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All mock data is fully wired and flows to the API responses.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: T-05-02 mitigated | src/lib/unifi/index.ts | UNIFI_MOCK uses no NEXT_PUBLIC_ prefix — server-only, not exposed to client bundle |
| threat_flag: T-05-03 mitigated | dev.sh | UNIFI_MOCK only exported in dev.sh, not in .env.production |

## Test Impact

Two pre-existing route test files (`tests/app/api/clients/route.test.ts`, `tests/app/api/firewall/route.test.ts`) mock `@/lib/unifi/client` directly. Now that routes import from `@/lib/unifi`, Vitest cannot resolve those mocks and reports export errors. These 2 failures are the expected state — Plan 05-02 will update vi.mock targets. The 3 other pre-existing failures (layout, dashboard page, firewall page tests referencing non-existent file paths) are unrelated to this plan.

## Self-Check: PASSED

- [x] `src/lib/unifi/mock.ts` exists — verified
- [x] `src/lib/unifi/index.ts` exists — verified
- [x] Routes import from `@/lib/unifi` — verified
- [x] `dev.sh` exports `UNIFI_MOCK=true` — verified
- [x] `client.ts` unchanged (zero diff from HEAD before this plan) — confirmed via git stash test
- [x] Commit 5586f7c exists — mock.ts
- [x] Commit 290954a exists — facade + routes + dev.sh
