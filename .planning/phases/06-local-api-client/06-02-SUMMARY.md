---
phase: 06-local-api-client
plan: "02"
subsystem: unifi-client
tags: [client, undici, tdd, local-api, wave-2]
dependency_graph:
  requires: [06-01]
  provides: [undici-client-impl, local-lan-client]
  affects:
    - src/lib/unifi/client.ts
    - tests/lib/unifi/client.test.ts
    - tests/lib/unifi/firewall.test.ts
tech_stack:
  added: []
  patterns:
    - undici.fetch with module-level Agent singleton (D-03)
    - scoped TLS bypass via connect.rejectUnauthorized: false (D-02)
    - response.ok guard before response.json() (Pitfall 1 mitigation)
    - AbortSignal.timeout(10_000) for request timeout
    - UNIFI_HOST + UNIFI_API_KEY env-var guard per function
key_files:
  created: []
  modified:
    - src/lib/unifi/client.ts
    - tests/lib/unifi/client.test.ts
    - tests/lib/unifi/firewall.test.ts
decisions:
  - "undici.Agent singleton at module init — not per request (D-03)"
  - "rejectUnauthorized: false in exactly ONE place (module-level Agent) — no NODE_TLS_REJECT_UNAUTHORIZED (D-02)"
  - "baseUrl() reads process.env.UNIFI_HOST inside function — not captured at init — so tests can mutate process.env between cases"
  - "firewall.test.ts updated alongside client.ts — it directly tests our rewritten functions and was broken by the ky→undici migration"
metrics:
  duration: "~12 minutes"
  completed: "2026-04-25"
  tasks_completed: 1
  files_modified: 3
---

# Phase 6 Plan 2: Undici Client Rewrite Summary

**One-liner:** Rewrote client.ts from ky against the Site Manager Proxy to undici.fetch against the local LAN console — scoped Agent with rejectUnauthorized: false, X-API-KEY auth, UNIFI_HOST base URL, response.ok guard on all four functions; all client tests GREEN.

## What Was Built

Single-file rewrite of `src/lib/unifi/client.ts`:

1. **Imports** — `import ky from 'ky'` replaced with `import { fetch, Agent } from 'undici'`. All other imports preserved verbatim.

2. **Module-level singleton Agent** — `const agent = new Agent({ connect: { rejectUnauthorized: false } })` created once at module init. This is the only place `rejectUnauthorized: false` appears — satisfying T-6-01 (scoped TLS, not global bypass).

3. **baseUrl() helper** — reads `process.env.UNIFI_HOST` inside the function body (not captured at init) so test mutations of `process.env` work correctly between test cases.

4. **transformClient** — preserved verbatim. Not a single character changed.

5. **FeatureMigrationSchema** — preserved verbatim inline in client.ts.

6. **All four exported functions** (`getUnifiClients`, `isZoneBasedFirewallEnabled`, `getFirewallPolicies`, `updateFirewallPolicy`) rewritten with:
   - Env-var guard: `if (!host || !apiKey) throw new Error('UNIFI_HOST and UNIFI_API_KEY environment variables are required')`
   - `dispatcher: agent` on every fetch call
   - `signal: AbortSignal.timeout(10_000)` on every fetch call
   - `if (!response.ok) throw new Error(\`UniFi API error: ${response.status} ${response.statusText}\`)` before every `response.json()` call
   - URLs: `https://${UNIFI_HOST}/proxy/network/v2/api/site/default/...` (no api.ui.com, no /ea/console/, no consoleId)

7. **updateFirewallPolicy** — uses `method: 'PUT'` and `body: JSON.stringify({ enabled })` (standard fetch body, not ky's `json:` shorthand).

8. **Untouched files** — `src/lib/unifi/index.ts`, `src/lib/unifi/mock.ts`, `src/lib/unifi/types.ts`, `src/lib/unifi/traffic.ts`, `package.json` — zero changes.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 015ed01 | feat(06-02): rewrite client.ts from ky to undici.fetch with scoped Agent |

## Verification Results

- `npx vitest run tests/lib/unifi/client.test.ts` — **7 PASS** (GREEN — Plan 01 RED tests now passing)
- `npx vitest run tests/lib/unifi/index.test.ts` — **4 PASS** (LOCAL-05 facade unchanged)
- `npx vitest run tests/lib/unifi/firewall.test.ts` — **16 PASS** (all firewall tests passing)
- Pre-existing failures (unrelated to Phase 6): 12 tests in 5 test files — confirmed pre-existing via git stash check (same failures existed before our changes)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Agent mock constructor in client.test.ts**
- **Found during:** Task 1 — first test run after rewrite
- **Issue:** Plan 01 left `Agent: vi.fn().mockImplementation(() => ({}))` in client.test.ts. Arrow functions cannot be used with `new` — vitest threw `TypeError: () => ({}) is not a constructor` and ALL 7 tests failed to run.
- **Fix:** Changed arrow function to regular function: `vi.fn().mockImplementation(function () { return {} })`
- **Files modified:** `tests/lib/unifi/client.test.ts`
- **Commit:** 015ed01 (bundled with client.ts rewrite)

**2. [Rule 1 - Bug] Updated firewall.test.ts mock from ky to undici**
- **Found during:** Task 1 — full suite run after client.ts rewrite
- **Issue:** `tests/lib/unifi/firewall.test.ts` still mocked `ky` (`vi.mock('ky', ...)`) and used `UNIFI_CONSOLE_ID` in `beforeEach`. After client.ts no longer imports ky, the 8 integration tests in this file threw `'UNIFI_HOST and UNIFI_API_KEY environment variables are required'` because: (a) the ky mock was no longer intercepting calls, (b) UNIFI_HOST was never set. This was a direct consequence of our rewrite — the tests directly call our rewritten functions.
- **Fix:** Replaced `vi.mock('ky', ...)` with `vi.mock('undici', ...)` using the same pattern as client.test.ts. Updated all per-test mock call sites from `vi.mocked(ky.get).mockReturnValue(...)` to `vi.mocked(fetch).mockResolvedValue(Response-like object)`. Changed `beforeEach` env setup from `UNIFI_CONSOLE_ID` to `UNIFI_HOST`. Updated `updateFirewallPolicy` test assertion to verify `fetch` was called with correct URL, method, and body (using the undici pattern rather than checking ky's `json:` option).
- **Files modified:** `tests/lib/unifi/firewall.test.ts`
- **Commit:** 015ed01 (bundled with client.ts rewrite)

## Known Stubs

None — this plan rewires the full HTTP client. No placeholder data, no hardcoded values flowing to UI. Manual UAT against live console is deferred to Plan 03 per the plan's success criteria (LOCAL-03 and LOCAL-04 require live hardware verification).

## Threat Flags

No new security-relevant surface beyond what was specified in the plan's threat model. All T-6-01 through T-6-06 mitigations are in place:

| Threat | Mitigation | Verified |
|--------|-----------|---------|
| T-6-01: Scoped TLS | `new Agent(` appears exactly once; `NODE_TLS_REJECT_UNAUTHORIZED` absent | grep -c "new Agent(" returns 1 |
| T-6-02: API key in bundle | `import 'server-only'` preserved at top of client.ts | present |
| T-6-04: DoS / hanging requests | `AbortSignal.timeout(10_000)` on all 4 fetch calls | grep -c returns 4 |

## Self-Check: PASSED

- src/lib/unifi/client.ts: FOUND — contains `import { fetch, Agent } from 'undici'`, 1x `new Agent(`, 4x `dispatcher: agent`, 4x `AbortSignal.timeout`, 4x env guard, 4x `UniFi API error:`, 1x `method: 'PUT'`, 1x `body: JSON.stringify({ enabled })`
- tests/lib/unifi/firewall.test.ts: FOUND — mocks undici, uses UNIFI_HOST
- Commit 015ed01: FOUND
- index.ts: unchanged (git diff empty)
- mock.ts: unchanged (git diff empty)
- package.json: unchanged (git diff empty)
