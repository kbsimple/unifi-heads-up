---
phase: 06-local-api-client
verified: 2026-04-25T21:28:00Z
status: human_needed
score: 3/5 must-haves verified (2 require live hardware)
overrides_applied: 0
human_verification:
  - test: "Run ./dev.sh, open http://localhost:3000, sign in, confirm mock dashboard loads with 6+ mock clients and 3+ firewall rules. Toggle one mock firewall rule — it should flip and persist for the session."
    expected: "Mock dashboard loads without server errors. No UNIFI_HOST connection attempts in server console. Toggle state persists in-memory until server restart."
    why_human: "Visual confirmation of UI render and in-memory state — cannot verify programmatically without running the Next.js dev server."
  - test: "With UNIFI_MOCK unset and real UNIFI_HOST + UNIFI_API_KEY set in .env.local, run npm run dev, open dashboard, confirm real devices appear by name/MAC."
    expected: "Dashboard loads real device data from LAN console. No 'Network error' or 'UniFi API error: 401/403' toasts. At least one device shows non-Idle traffic status."
    why_human: "Requires physical access to a UniFi console on the LAN — automated tests mock the HTTP layer."
  - test: "With real console connection active, observe server terminal output when the dashboard loads."
    expected: "No UNABLE_TO_VERIFY_LEAF_SIGNATURE or self-signed certificate errors. Proves the scoped undici Agent handles the console's self-signed cert correctly."
    why_human: "TLS error absence can only be confirmed against a real self-signed cert — the mock bypasses the TLS layer entirely."
  - test: "Open app Firewall page in one tab and UniFi OS admin UI in another. Toggle a low-impact rule OFF in the app. Refresh the admin UI tab."
    expected: "The rule shows as DISABLED in the UniFi OS admin UI. Toggle it back ON in the app, refresh admin tab — shows ENABLED. Proves PUT /firewall-policies/{id} persists on the console."
    why_human: "Requires live UniFi console + admin UI access — the unit test mocks the fetch response and cannot confirm server-side persistence."
deferred:
  - truth: "Running against a real UniFi console loads the dashboard with real device data (LOCAL-01, LOCAL-02, LOCAL-03)"
    addressed_in: "Phase 7"
    evidence: "06-03-SUMMARY.md Phase Gate section: 'Phase 7 Docker deployment is the natural moment to close this gap — the Docker container will be deployed on a machine with LAN access, making all four deferred verifications straightforward.' Phase 7 re-verification checklist items 2-5 map directly to LOCAL-01..04."
  - truth: "Toggling a firewall rule in the app changes its state in the UniFi OS admin UI (LOCAL-04)"
    addressed_in: "Phase 7"
    evidence: "Phase 7 re-verification checklist item 5: 'Firewall toggle in app reflects immediately in UniFi OS admin UI (LOCAL-04)'"
---

# Phase 6: Local API Client Verification Report

**Phase Goal:** The app communicates directly with the UniFi console over LAN and all features deliver real data.
**Verified:** 2026-04-25T21:28:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | App authenticates to the local UniFi console using X-API-KEY — no cloud proxy involved | VERIFIED | `client.ts` line 84-87: headers include `X-API-KEY: apiKey`. URL pattern confirmed `https://${UNIFI_HOST}/proxy/network/...`. Unit test "sends X-API-KEY header to UNIFI_HOST-based URL" passes. No `api.ui.com` anywhere in codebase. |
| 2 | Scoped undici Agent handles self-signed TLS without affecting other HTTPS requests | VERIFIED | `client.ts` line 28-30: single module-level `new Agent({ connect: { rejectUnauthorized: false } })`. Grep confirms exactly 1 occurrence of `new Agent(`. No `NODE_TLS_REJECT_UNAUTHORIZED` anywhere in src/, tests/, or env files. Unit test "creates undici Agent with rejectUnauthorized: false" passes. |
| 3 | Traffic status dashboard shows real device data from live local console | HUMAN NEEDED | Code path verified (transformClient preserved verbatim, Zod parsing intact, correct URL). End-to-end requires live UniFi hardware on LAN — deferred to Phase 7. |
| 4 | Firewall rule toggled in app is reflected in UniFi OS admin UI | HUMAN NEEDED | `updateFirewallPolicy` sends correct PUT with `body: JSON.stringify({ enabled })` — unit test in firewall.test.ts (16 PASS) confirms wire format. Visual confirmation in admin UI requires live hardware — deferred to Phase 7. |
| 5 | Running with UNIFI_MOCK=true still produces mock data | VERIFIED | `index.ts` and `mock.ts` are confirmed unmodified (Plans 01-02 explicitly preserved them). `tests/lib/unifi/index.test.ts` — 4 PASS. Unit-level confidence: HIGH. Manual dev-server verification deferred to Phase 7 Docker deployment. |

**Score:** 3/5 truths fully verified. 2/5 require live UniFi hardware (human_needed, deferred to Phase 7).

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Real device data from live console (LOCAL-01, LOCAL-02, LOCAL-03) | Phase 7 | 06-03-SUMMARY.md Phase Gate: Phase 7 re-verification checklist items 2-4 |
| 2 | Firewall toggle persists in UniFi OS admin UI (LOCAL-04) | Phase 7 | 06-03-SUMMARY.md Phase Gate: Phase 7 re-verification checklist item 5 |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/unifi/client.ts` | undici-based LAN client, 4 exported functions | VERIFIED | 230 lines. Imports `fetch, Agent` from `undici`. 1x `new Agent(`, 4x `dispatcher: agent`, 4x `AbortSignal.timeout(10_000)`, 4x env guard, 4x `UniFi API error:`, 1x `method: 'PUT'`, 1x `body: JSON.stringify({ enabled })`. |
| `tests/lib/unifi/client.test.ts` | undici mocks, 7+ tests | VERIFIED | 167 lines. `vi.mock('undici')` present. No `vi.mock('ky')`. 7 `it(` blocks. UNIFI_HOST env setup. All 7 tests pass. |
| `.env.local.example` | Documented env template | VERIFIED | 765 bytes. Contains `UNIFI_HOST`, `UNIFI_API_KEY`, auth vars, `SESSION_SECRET`, `# UNIFI_MOCK="true"`. No `VERCEL_OIDC_TOKEN`, no `UNIFI_CONSOLE_ID`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|---|-----|--------|---------|
| `client.ts` | `process.env.UNIFI_HOST + UNIFI_API_KEY` | env guard at top of every function | WIRED | 4 occurrences of the guard pattern confirmed by grep |
| `client.ts` | undici Agent dispatcher | `dispatcher: agent` passed to every fetch | WIRED | 4 occurrences of `dispatcher: agent` confirmed |
| `client.ts` | Zod schemas in ./types | `UnifiClientSchema.array().parse(data)` and `FirewallPolicyResponseSchema.parse(data)` | WIRED | Both parse calls confirmed in client.ts |
| `tests/lib/unifi/client.test.ts` | `src/lib/unifi/client.ts` | `vi.mock('undici')` intercepts undici import in client.ts | WIRED | `vi.mock('undici'` confirmed in test file |
| `.env.local.example` | contributors / Phase 7 Docker | documented template committed to repo | WIRED | File tracked in git (gitignore exception `!.env.local.example`) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/lib/unifi/client.ts` — `getUnifiClients` | `clients` (NetworkClient[]) | `fetch(${baseUrl()}/stat/sta)` → `UnifiClientSchema.array().parse(data)` → `transformClient` | Yes (real fetch to UNIFI_HOST, Zod-validated) | WIRED — data flows from fetch to parse to transform. End-to-end against live console deferred (human_needed). |
| `src/lib/unifi/client.ts` — `updateFirewallPolicy` | PUT body `{ enabled }` | `JSON.stringify({ enabled })` passed as `body` | Yes (real PUT with dynamic param) | WIRED — body confirmed by unit test |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 6 unit tests pass | `npx vitest run tests/lib/unifi/client.test.ts tests/lib/unifi/index.test.ts` | 2 files, 11 tests, all PASS, exit 0 | PASS |
| No global TLS bypass in codebase | `grep -rn NODE_TLS_REJECT_UNAUTHORIZED src/ tests/ .env.local.example` | Zero matches | PASS |
| Agent singleton invariant | `grep -c "new Agent(" src/lib/unifi/client.ts` | 1 | PASS |
| Mock path unit coverage | `npx vitest run tests/lib/unifi/index.test.ts` | 4 tests, all PASS | PASS |
| Live dev server mock path | Run `./dev.sh`, open localhost:3000 | Cannot verify without running server | SKIP — routed to human verification |
| Live console connection | `npm run dev` with real UNIFI_HOST | Cannot verify without LAN hardware | SKIP — deferred to Phase 7 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LOCAL-01 | 06-01, 06-02, 06-03 | X-API-KEY auth via direct LAN HTTPS | SATISFIED (unit) / human_needed (e2e) | client.ts headers + unit test "sends X-API-KEY header to UNIFI_HOST-based URL" passes |
| LOCAL-02 | 06-01, 06-02, 06-03 | Scoped undici Agent, no global TLS bypass | SATISFIED (unit) / human_needed (e2e) | 1x `new Agent(`, zero `NODE_TLS_REJECT_UNAUTHORIZED`, unit test passes |
| LOCAL-03 | 06-02, 06-03 | Real traffic data: badges, 24h history, device groups | SATISFIED (unit) / human_needed (e2e) | transformClient verbatim, Zod schemas intact, correct URL. Live hardware deferred. |
| LOCAL-04 | 06-02, 06-03 | Firewall toggles persist on console | SATISFIED (unit) / human_needed (e2e) | PUT with `{ enabled }` body confirmed. firewall.test.ts 16 PASS. Visual admin UI confirmation deferred. |
| LOCAL-05 | 06-01, 06-02 | UNIFI_MOCK=true mock layer unchanged | SATISFIED (unit) | index.ts and mock.ts unmodified confirmed. index.test.ts 4 PASS. |

No orphaned requirements — all 5 LOCAL requirements claimed in plans and verified above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODOs, FIXMEs, placeholder returns, or hardcoded empty data found in Phase 6 modified files. The `UNIFI_CONSOLE_ID` delete in client.test.ts line 20 (`delete process.env.UNIFI_CONSOLE_ID`) is a defensive cleanup, not a stub.

### Human Verification Required

#### 1. Mock path dev server (LOCAL-05 end-to-end)

**Test:** Run `./dev.sh` from project root, open `http://localhost:3000`, sign in as admin, confirm dashboard loads with 6+ mock device cards and firewall page shows 3+ rules. Toggle one mock rule and confirm it flips.
**Expected:** Dashboard renders mock data. No UNIFI_HOST connection attempts in server console. Toggle persists for the session.
**Why human:** Requires running Next.js dev server — cannot automate without a server process.

#### 2. Live console — real device data (LOCAL-01, LOCAL-02, LOCAL-03)

**Test:** Edit `.env.local` to comment out `UNIFI_MOCK="true"`, set real `UNIFI_HOST` (console LAN IP) and `UNIFI_API_KEY`. Run `npm run dev`, open dashboard.
**Expected:** Dashboard shows recognisable real device names/MACs from LAN. At least one device shows non-Idle traffic status. Device groups and 24h history chart load. Server console shows no TLS certificate errors.
**Why human:** Requires physical UniFi console on LAN — automated tests mock the HTTP layer.

#### 3. Firewall toggle persistence (LOCAL-04)

**Test:** With live console connected, open app Firewall page in one tab and UniFi OS admin UI at `https://<UNIFI_HOST>/network/default/settings/firewall/policy` in another. Toggle a low-impact rule OFF in the app, refresh admin tab.
**Expected:** Rule shows DISABLED in admin UI. Toggle back ON, refresh — shows ENABLED.
**Why human:** Server-side persistence can only be confirmed by reading the console's own admin UI — API response alone does not prove the state was saved.

### Gaps Summary

No blocking gaps. All code-level work is complete and verified:
- `src/lib/unifi/client.ts` fully rewritten (ky removed, undici + scoped Agent, correct LAN URLs, env guards, response guards, 10s timeout)
- All 11 Phase 6 unit tests GREEN
- All 16 firewall tests GREEN
- No global TLS bypass anywhere in the codebase
- `.env.local.example` committed for contributors and Phase 7

The outstanding items are all end-to-end validations that require live UniFi hardware. These are correctly classified as `human_needed` per Phase 6 plan design (Plan 03 Task 2 is a `checkpoint:human-verify` gate explicitly deferred to Phase 7 Docker deployment).

---

_Verified: 2026-04-25T21:28:00Z_
_Verifier: Claude (gsd-verifier)_
