---
phase: 18-per-client-app-visibility
verified: 2026-07-18T15:28:00Z
status: human_needed
score: 7/8 must-haves verified (automated); must-have 7 requires human
overrides_applied: 0
human_verification:
  - test: "Navigate to /dpi-probe (unauthenticated) and confirm redirect to /login"
    expected: "Browser redirects to /login without showing the DPI form"
    why_human: "Middleware redirect behavior requires a running server; cannot verify with grep or unit tests"
  - test: "Log in, navigate to /dpi-probe, enter 'aa:bb:cc:dd:ee:01', click Probe (with UNIFI_MOCK=true)"
    expected: "JSON response displayed in <pre> block showing status: ok, mock: true, decoded array with Youtube/Netflix/Slack"
    why_human: "Client-side fetch → JSON render flow requires a browser; cannot verify with unit tests"
---

# Phase 18: Per-Client App Visibility (DPI) Verification Report

**Phase Goal:** Build a small, isolated DPI probe tool — a diagnostic API endpoint + lightweight page that queries the UniFi DPI API directly and displays raw results. Validate that the endpoint is accessible, what it returns, and what app ID decoding looks like on the user's actual hardware BEFORE any dashboard integration is built.
**Verified:** 2026-07-18T15:28:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `src/lib/dpi/cat_app.json` exists with `"262256": { "name": "Youtube" }` and `"262276": { "name": "Netflix" }` | ✓ VERIFIED | File present; `grep '"262256"'` and `'"262276"'` both match exact entries |
| 2 | `decodeAppId(4, 112)` returns `{ compoundId: 262256, appName: "Youtube", catName: "Media streaming services" }` | ✓ VERIFIED | `lookup.ts` implements `(cat << 16) + app`; lookup.test.ts covers this case; 20/20 dpi tests pass |
| 3 | `probeDpiMock(['aa:bb:cc:dd:ee:01'])` returns `{ status: 'ok', mock: true, decoded: [Youtube, Netflix, Slack] }` | ✓ VERIFIED | `probe.ts` mock hardcodes app=112/cat=4 (Youtube), app=132/cat=4 (Netflix), app=39/cat=0 (Slack); probe.test.ts covers this; 20/20 dpi tests pass |
| 4 | `GET /api/dpi/probe?mac=...` returns 401 when no session, 400 when no mac | ✓ VERIFIED | `route.ts` checks session first (401 UNAUTHORIZED), then mac param (400); route.test.ts 6/6 pass |
| 5 | `/dpi-probe` is in `protectedRoutes` in `src/middleware.ts` | ✓ VERIFIED | Line 6: `const protectedRoutes = ['/dashboard', '/dpi-probe']` |
| 6 | `src/app/dpi-probe/page.tsx` exists with a form, handleSubmit, and fetch to `/api/dpi/probe` | ✓ VERIFIED | Page has `'use client'`, `handleSubmit`, `fetch('/api/dpi/probe?mac=...')`, `encodeURIComponent`, `← Dashboard` link |
| 7 | Full test suite passes (380 tests) | ✓ VERIFIED | `npx vitest run`: 380 tests, 48 files — all pass, 0 failures |
| 8 | No dashboard integration or `dpi_snapshots` table was added (LOCKED constraint honored) | ✓ VERIFIED | No DPI references outside `src/lib/dpi/`, `src/app/api/dpi/`, `src/app/dpi-probe/`, and the middleware route entry |

**Score:** 8/8 truths verified (automated)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/dpi/cat_app.json` | Static compound-ID map | ✓ VERIFIED | 200+ entries; Youtube 262256, Netflix 262276, Media streaming category present |
| `src/lib/dpi/lookup.ts` | `decodeAppId()` with `server-only` | ✓ VERIFIED | Exports `decodeAppId`, imports `server-only`, implements `(cat << 16) + app` formula |
| `src/lib/dpi/probe.ts` | `probeDpi`, `probeDpiMock`, helpers | ✓ VERIFIED | Exports all 4 functions; scoped undici Agent; 10s timeout; `stat/stadpi` endpoint path |
| `src/lib/dpi/lookup.test.ts` | 8 tests covering formula + known apps | ✓ VERIFIED | All 8 tests pass |
| `src/lib/dpi/probe.test.ts` | 12 tests covering inferStatus, decode, mock | ✓ VERIFIED | All 12 tests pass |
| `src/app/api/dpi/probe/route.ts` | `GET` handler, auth-gated, mock mode | ✓ VERIFIED | Session check, mac param check, mock dispatch, live dispatch |
| `tests/app/api/dpi/probe/route.test.ts` | 6 route tests (401, 400, mock, live, body, mac) | ✓ VERIFIED | All 6 tests pass |
| `src/app/dpi-probe/page.tsx` | Client Component with form + JSON display | ✓ VERIFIED | `'use client'`, form, handleSubmit, fetch, pre block, error box |
| `src/middleware.ts` (updated) | `/dpi-probe` in protectedRoutes | ✓ VERIFIED | Line 6 confirms both `/dashboard` and `/dpi-probe` in array |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `lookup.ts` | `cat_app.json` | `import catAppJson from './cat_app.json'` | ✓ WIRED | Import present, used in `decodeAppId` |
| `probe.ts` | `lookup.ts` | `import { decodeAppId } from './lookup'` | ✓ WIRED | Called in `decodeDpiResponse` |
| `route.ts` | `probe.ts` | `import { probeDpi, probeDpiMock } from '@/lib/dpi/probe'` | ✓ WIRED | Both called conditionally on mock flag |
| `dpi-probe/page.tsx` | `/api/dpi/probe` | `fetch('/api/dpi/probe?mac=...')` in `handleSubmit` | ✓ WIRED | Fetch present, response assigned to `setResult` |
| `middleware.ts` | `/dpi-probe` | `protectedRoutes` array check | ✓ WIRED | `path.startsWith(route)` pattern covers `/dpi-probe` |

### Data-Flow Trace (Level 4)

`dpi-probe/page.tsx` renders dynamic data from user-triggered fetch, not server-side state. This is a diagnostic tool pattern — data flows only on user action (submit), not from a pre-loaded store. The `result` state is set from `res.json()` after a real `fetch` call to `/api/dpi/probe`. No static/hardcoded data rendered in the normal path.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `page.tsx` | `result` (state) | `fetch /api/dpi/probe` → `res.json()` | Yes — route calls `probeDpi` or `probeDpiMock` with real mac | ✓ FLOWING |
| `route.ts` | return value | `probeDpiMock(macs)` / `probeDpi(macs)` | Yes — mock returns structured data; live calls UniFi API | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| DPI library tests (20 tests) | `npx vitest run src/lib/dpi/` | 20 passed (0 failures) | ✓ PASS |
| Route tests (6 tests) | `npx vitest run tests/app/api/dpi/probe/route.test.ts` | 6 passed (0 failures) | ✓ PASS |
| Full suite | `npx vitest run` | 380 passed, 48 files, 0 failures | ✓ PASS |
| Middleware redirect (unauthenticated /dpi-probe) | Requires running server | N/A | ? SKIP |
| Page renders mock DPI JSON in browser | Requires browser + running server | N/A | ? SKIP |

### Requirements Coverage

No requirement IDs were declared in the plan frontmatter (both plans list `requirements: []`). Phase 18 is a probe/diagnostic tool with no requirements from REQUIREMENTS.md — this matches the CONTEXT.md framing ("validation tool only").

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `probe.ts` | 88 | `return []` | ℹ️ Info | Legitimate guard — returns empty array when `by_app` is absent/empty. Not a stub. |
| `page.tsx` | 41–42 | `placeholder="aa:bb:cc:dd:ee:01"` | ℹ️ Info | HTML input placeholder attribute. Not a code stub. |

No blockers. No warnings. Both matches are correct, non-stub behavior.

### Locked Constraint Verification

**"No dashboard integration, no dpi_snapshots table"** — HONORED.

Search for DPI references outside the probe module:
- No `dpi_snapshots` anywhere in `src/`
- No `probeDpi`, `cat_app`, or DPI imports in `src/app/dashboard/`, `src/components/`, or any other non-probe location
- The only cross-cutting reference is `src/middleware.ts` line 6 (route protection) — expected and correct

### Human Verification Required

#### 1. Middleware redirect — unauthenticated access

**Test:** Open a private/incognito browser window. Navigate to `http://localhost:3000/dpi-probe` without logging in.
**Expected:** Browser redirects to `http://localhost:3000/login` and the DPI probe form is never shown.
**Why human:** Middleware redirect behavior requires a running Next.js server; cannot be verified with grep or unit tests.

#### 2. End-to-end probe flow (mock mode)

**Test:**
1. Set `UNIFI_MOCK=true` in `.env.local`
2. Run `npm run dev`
3. Log in at `http://localhost:3000/login`
4. Navigate to `http://localhost:3000/dpi-probe`
5. Enter `aa:bb:cc:dd:ee:01` in the MAC field and click Probe

**Expected:** The `<pre>` block below the form renders JSON similar to:
```json
{
  "status": "ok",
  "mock": true,
  "decoded": [
    { "appName": "Youtube", "compoundId": 262256, ... },
    { "appName": "Netflix", "compoundId": 262276, ... },
    { "appName": "Slack",   "compoundId": 39,     ... }
  ]
}
```
**Why human:** Client-side fetch + state → render cycle requires a browser; unit tests mock the fetch.

### Gaps Summary

No automated gaps. All 8 must-haves verified. Two items require human spot-check with a running server (middleware redirect behavior and browser render of the DPI form). The probe-first scope constraint (no dashboard integration, no dpi_snapshots) is fully honored.

---

_Verified: 2026-07-18T15:28:00Z_
_Verifier: Claude (gsd-verifier)_
