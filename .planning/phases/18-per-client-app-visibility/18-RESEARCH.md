# Phase 18: Per-Client App Visibility (DPI) - Research

**Researched:** 2026-07-18
**Domain:** UniFi DPI API, Next.js API route, diagnostic probe UI
**Confidence:** MEDIUM — endpoint shape and compound-ID formula verified via unpoller Go source and community wiki; dynamic.dpi.js URL, disabled-DPI response exact shape, and X-API-KEY auth on stadpi require live-hardware confirmation

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Probe-first approach (LOCKED):** Phase 18 delivers a validation tool only. Full DPI integration into the dashboard is deferred until the probe confirms the UniFi DPI API is reachable and returns useful data on the user's hardware.
- **No snapshot recording in Phase 18 (LOCKED):** No `dpi_snapshots` table, no recorder, no delta math. Raw API call only.
- **No integration into client-table.tsx (LOCKED):** The expanded device row is not touched in Phase 18.

### Claude's Discretion
- Probe surface: `GET /api/dpi/probe?mac={mac}` returns raw stadpi JSON plus decoded app names in one response; `/dpi-probe` page with form entry and raw JSON display.
- Page accessible without dashboard navigation (direct URL); auth via session required.
- Mock mode: realistic mock DPI response when `UNIFI_MOCK=true`.

### Deferred Ideas (OUT OF SCOPE)
- `dpi_snapshots` SQLite table + periodic recorder
- Delta computation (bytes in window)
- Dashboard integration (expanded row "Top Apps" section)
- Time-window selector integration
- App icon support
- All production UI design decisions
</user_constraints>

---

## Summary

Phase 18 is a narrow, self-contained diagnostic probe. The UniFi `stat/stadpi` endpoint is a legacy v1 API path that returns cumulative per-app byte counts keyed by numeric `(cat, app)` pair. The endpoint is well-documented via the community wiki and unpoller's Go client; the response schema and compound ID formula are cross-verified across multiple sources.

The single most important unknown is the exact URL for the app ID lookup file (`dynamic.dpi.js`). No source in this research found a fetchable URL. Every mature implementation (unpoller, Art-of-WiFi) bundles the lookup as a static artifact rather than fetching it from the controller at runtime. The recommended approach follows suit: ship `cat_app.json` as a static JSON import alongside the probe, so the probe response can include decoded names without any controller-side file fetch.

The probe implementation is 4–5 files: one new function in the UniFi client facade, one API route, one page component, and the bundled lookup JSON. No database, no new Zod schema in types.ts, no middleware changes beyond adding `/dpi-probe` to `protectedRoutes`.

**Primary recommendation:** Bundle cat_app.json as a static import; add `getDpiStats(mac)` to the client/mock/index facade; implement `GET /api/dpi/probe?mac=` returning `{raw, decoded}` in a single response.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Call stadpi endpoint | API / Backend | — | Needs X-API-KEY (server-only secret) and self-signed TLS bypass via undici Agent |
| Decode compound app ID | API / Backend | — | Pure lookup; runs server-side before response is returned |
| Render probe output | Browser / Client | Frontend Server (SSR) | Page is simple enough to be a Server Component (no realtime polling needed) |
| Auth gate on probe page | Frontend Server (SSR) | — | Middleware `protectedRoutes` handles redirect to `/login` |
| Auth gate on probe API | API / Backend | — | `getSession()` called inside route handler (middleware skips `/api/**`) |

---

## DPI API Endpoint

### URL and Method

```
POST https://{UNIFI_HOST}/proxy/network/api/s/default/stat/stadpi
```

This is the **v1 legacy path** — NOT the v2 path (`/proxy/network/v2/api/site/default`). There is no documented v2 equivalent for `stat/stadpi`. The existing `client.ts` already knows this distinction: `clientsUrl()` conditionally returns the v1 base when `UNIFI_API_VERSION=v1`. For the probe, always use the v1 base explicitly.

[CITED: ubntwiki.com community wiki; unpoller/unifi dpi.go struct tags]

### Request Body

```json
{"type":"by_app","macs":["aa:bb:cc:dd:ee:01"]}
```

- `type`: `"by_app"` or `"by_cat"`. Use `"by_app"` — per-app data is what the probe wants.
- `macs`: array of MAC addresses to filter by. Omitting returns all clients' data.

[CITED: ubntwiki.com; Art-of-WiFi Client.php `list_dpi_stats_filtered()`]

### Response Shape (happy path)

```json
{
  "meta": {"rc": "ok"},
  "data": [
    {
      "mac": "aa:bb:cc:dd:ee:01",
      "last_updated": 1750000000,
      "by_app": [
        {"app": 112, "cat": 4, "rx_bytes": 1500000000, "tx_bytes": 50000000, "rx_packets": 1000000, "tx_packets": 100000},
        {"app": 1,   "cat": 0, "rx_bytes": 250000000,  "tx_bytes": 25000000, "rx_packets": 300000,  "tx_packets": 50000}
      ],
      "by_cat": [
        {"app": 0, "cat": 4, "rx_bytes": 2000000000, "tx_bytes": 80000000, "rx_packets": 1500000, "tx_packets": 200000}
      ]
    }
  ]
}
```

**Field names (verified from unpoller/unifi dpi.go struct):**

| JSON key | Type | Meaning |
|----------|------|---------|
| `mac` | string | MAC address of the device |
| `last_updated` | number | Unix timestamp of last DPI update |
| `by_app` | array | Per-application stats |
| `by_cat` | array | Per-category stats |
| `app` | number | Raw application ID (part of compound key) |
| `cat` | number | Category ID (part of compound key) |
| `rx_bytes` | number | Bytes received (cumulative total) |
| `tx_bytes` | number | Bytes transmitted (cumulative total) |
| `rx_packets` | number | Packets received (cumulative) |
| `tx_packets` | number | Packets transmitted (cumulative) |
| `known_clients` | number | Optional — present in site-wide stats |

[VERIFIED: unpoller/unifi dpi.go — `DPIData` and `DPITable` struct JSON tags]

**Important:** `rx_bytes` and `tx_bytes` are **cumulative totals** since DPI was enabled, not rates. The probe displays them as-is (raw validation output only).

### Response When DPI Is Disabled

When DPI is disabled in Settings → Traffic Management → Deep Packet Inspection, the endpoint returns HTTP 200 with:

```json
{"meta": {"rc": "ok"}, "data": [{}]}
```

An empty object inside the data array. Alternatively, some firmware versions return `"data": []`. The probe must detect this case — `data` is empty or `data[0]` has no `by_app` key — and surface a `"DPI disabled or no data"` message, NOT an error.

[VERIFIED: github.com/unpoller/unpoller issue #834 — user reported "30 bytes" response, determined to be `{"meta":{"rc":"ok"},"data":[{}]}`]

### Error Cases

| Condition | HTTP Status | What to show |
|-----------|-------------|--------------|
| DPI disabled | 200 | "DPI disabled or no data for this device" |
| No traffic for device | 200 (empty `by_app: []`) | "No DPI data for this device" |
| Endpoint doesn't exist (old firmware) | 404 | "DPI endpoint not available on this firmware" |
| Auth failure | 401 | "Authentication error — check X-API-KEY" |
| Network error | 500/exception | "Cannot reach UniFi console" |

---

## App ID Lookup

### Compound ID Formula

```
compound_id = (cat << 16) + app
```

Example: `cat=4` (Streaming Media), `app=112` → `compound_id = (4 << 16) + 112 = 262256` → YouTube

[VERIFIED: ubntwiki.com community wiki; Art-of-WiFi Client.php `compoundId()` reference; unpoller/unifi dpi.go `GetApp()` method]

### cat_app.json Structure

The lookup table is available as a static JSON file at the community wiki. Its structure:

```json
{
  "version": {"major": 1, "minor": 406},
  "categories": {
    "4": {
      "name": "Streaming Media",
      "applications": [112, 113, ...],
      "iconCss": "..."
    }
  },
  "applications": {
    "262256": {"name": "Youtube",  "iconCss": "...", "iconUrl": "/dpi_icons/youtube.com/favicon.ico"},
    "262257": {"name": "Netflix",  "iconCss": "..."},
    "1":      {"name": "MSN"}
  }
}
```

Keys in `applications` are the compound IDs as strings. The `name` field is the human-readable app name.

Contains ~2,213 application definitions.

[VERIFIED: ubntwiki.com/products/software/unifi-controller/api/cat_app_json — full structure confirmed]

### Fetching vs. Bundling the Lookup

**dynamic.dpi.js URL:** The exact path to fetch this file from a live UniFi controller is **not found in any public documentation or open-source implementation**. No project fetches it at runtime.

**What every mature implementation does instead:**
- **unpoller/unifi:** Hardcodes the map as a Go `map[int]string` derived from an offline USG DPI tarball (`fw-download.ubnt.com/data/usg-dpi/...`)
- **Art-of-WiFi API browser:** References cat_app.json as a static extraction from the JS file
- **ubntwiki:** Hosts cat_app.json as a static reference document

**Recommendation:** Download cat_app.json from the wiki once, commit it to the repo at `src/lib/dpi/cat_app.json`, and import it statically. No runtime fetch from the controller needed.

[ASSUMED: The dynamic.dpi.js URL is not publicly documented and may require auth or a browser session to fetch — using a static bundle avoids this entirely]

### decode() Helper

```typescript
// src/lib/dpi/lookup.ts
import catAppJson from './cat_app.json'

export interface AppLookup {
  appName: string
  catName: string
}

export function decodeAppId(cat: number, app: number): AppLookup {
  const compoundId = String((cat << 16) + app)
  const appEntry = (catAppJson as CatApp).applications[compoundId]
  const catEntry = (catAppJson as CatApp).categories[String(cat)]
  return {
    appName: appEntry?.name ?? `App ${compoundId}`,
    catName: catEntry?.name ?? `Category ${cat}`,
  }
}
```

---

## Probe Implementation

### File Structure

```
src/
├── app/
│   ├── api/
│   │   └── dpi/
│   │       └── probe/
│   │           └── route.ts        # GET /api/dpi/probe?mac={mac}
│   └── dpi-probe/
│       └── page.tsx               # /dpi-probe diagnostic page
└── lib/
    └── dpi/
        ├── cat_app.json           # Bundled static lookup (download once, commit)
        └── lookup.ts              # decodeAppId() helper
```

The `getDpiStats()` function lives inside the route file itself (or a small `src/lib/dpi/stats.ts`) — not in the UniFi client facade. The DPI probe is a standalone diagnostic feature; adding it to the facade would require extending mock.ts, index.ts, and client.ts for a one-off validation tool.

**Alternative (facade approach):** Add `getDpiStats(mac: string): Promise<DpiRawResponse>` to client.ts + mock.ts + index.ts. Cleaner if DPI will eventually be a recurring API call. For Phase 18 (raw probe only), the route-local approach is simpler.

**Recommended for Phase 18:** Keep the stadpi call inside the route handler directly, with inline mock detection. Less coupling. If DPI gets promoted to a production feature in a later phase, it can be promoted to the facade at that point.

### API Route: GET /api/dpi/probe

```typescript
// src/app/api/dpi/probe/route.ts
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { fetch, Agent } from 'undici'
import { getSession } from '@/lib/session'
import { decodeAppId } from '@/lib/dpi/lookup'

// Scoped agent — same pattern as statusz.ts (agent in client.ts is not exported)
const dpiAgent = new Agent({ connect: { rejectUnauthorized: false } })

function v1BaseUrl(): string {
  return `https://${process.env.UNIFI_HOST}/proxy/network/api/s/default`
}

export async function GET(req: NextRequest) {
  // Auth gate (middleware excludes /api/** so we check session here)
  const session = await getSession()
  if (!session?.username) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const mac = req.nextUrl.searchParams.get('mac')
  if (!mac) {
    return NextResponse.json({ error: 'mac query param required' }, { status: 400 })
  }

  // Mock mode
  if (process.env.UNIFI_MOCK === 'true') {
    return NextResponse.json(buildMockResponse(mac))
  }

  const apiKey = process.env.UNIFI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'UNIFI_API_KEY not set' }, { status: 500 })
  }

  try {
    const res = await fetch(`${v1BaseUrl()}/stat/stadpi`, {
      method: 'POST',
      dispatcher: dpiAgent,
      signal: AbortSignal.timeout(10_000),
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'by_app', macs: [mac] }),
    })

    const raw = await res.json() as UnifiDpiResponse
    const decoded = decodeDpiResponse(raw)
    return NextResponse.json({ raw, decoded, status: inferStatus(raw) })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'FETCH_FAILED', message }, { status: 502 })
  }
}
```

### Status Detection

```typescript
function inferStatus(raw: UnifiDpiResponse): 'ok' | 'disabled' | 'empty' | 'error' {
  if (!raw?.data || raw.data.length === 0) return 'disabled'
  const first = raw.data[0]
  if (!first || !first.by_app) return 'disabled'        // DPI off → {}, no by_app key
  if (first.by_app.length === 0) return 'empty'         // DPI on, no traffic for this device
  return 'ok'
}
```

### Mock Response

Use the same MAC addresses as the mock clients. The mock returns a realistic multi-app response:

```typescript
function buildMockResponse(mac: string) {
  const mockApps = [
    // cat=4 (Streaming), app=112 → YouTube (compound: 262256)
    { app: 112, cat: 4, rx_bytes: 1_500_000_000, tx_bytes: 50_000_000, rx_packets: 1_000_000, tx_packets: 100_000 },
    // cat=4 (Streaming), app=113 → Netflix (compound: 262257 — verify on hw)
    { app: 113, cat: 4, rx_bytes: 800_000_000,   tx_bytes: 30_000_000, rx_packets: 600_000,   tx_packets: 60_000 },
    // cat=0 (Instant messaging), app=1 → MSN/Discord-adjacent
    { app: 1,   cat: 0, rx_bytes: 120_000_000,   tx_bytes: 15_000_000, rx_packets: 200_000,   tx_packets: 40_000 },
  ]
  const raw = {
    meta: { rc: 'ok' },
    data: [{ mac, last_updated: Math.floor(Date.now() / 1000), by_app: mockApps, by_cat: [] }],
  }
  const decoded = decodeDpiResponse(raw)
  return { raw, decoded, status: 'ok', mock: true }
}
```

Note: Netflix compound ID (262257) needs live-hardware verification — `cat_app.json` has the ground truth.

### Probe Page: /dpi-probe

Simple Server Component form. On submit, client-side JS calls `GET /api/dpi/probe?mac={mac}` and displays the JSON.

Since this is a diagnostic tool (not a dashboard flow), a Client Component with `useState` is acceptable:

```typescript
// src/app/dpi-probe/page.tsx
'use client'
// Form + fetch + pre-formatted JSON display
// No SWR needed — one-shot probe
```

**Auth:** Add `/dpi-probe` to `protectedRoutes` in `src/middleware.ts`. The middleware already handles the redirect pattern for `/dashboard`.

---

## Unknowns & Live-Hardware Risks

| # | Unknown | Impact if Wrong | Mitigation |
|---|---------|----------------|------------|
| U1 | Exact shape of "DPI disabled" response — `[{}]` vs `[]` vs HTTP error | `inferStatus()` misclassifies disabled vs ok | Handle all three cases; probe displays raw JSON so user can see ground truth |
| U2 | X-API-KEY accepted by stadpi endpoint (all evidence points to yes but unconfirmed) | 401 or 403 from stadpi | Probe returns status code in response body; user can see auth error |
| U3 | Minimum firmware version for stadpi on Dream Router 7 | 404 from stadpi | Probe shows HTTP status in response; known issue to investigate |
| U4 | dynamic.dpi.js URL on controller (UNRESOLVED) | N/A — not used; bundling cat_app.json instead | Static bundle avoids this entirely |
| U5 | Exact compound ID for Netflix, Discord, Zoom in cat_app.json | Mock app names may be wrong | Mock uses numeric IDs + cat_app.json decode; wrong names show as "App XXXXXX" — acceptable for diagnostics |
| U6 | Whether stadpi returns data per-MAC or aggregated when multiple MACs given | Probe may get blended data | Phase 18 always sends exactly one MAC; not a concern |

**What the probe WILL confirm on first run:**
1. HTTP status from the stadpi endpoint
2. Actual response body (raw JSON displayed)
3. Whether X-API-KEY auth works
4. Whether DPI enabled/disabled state is detectable
5. Actual compound IDs for the apps in use (to verify cat_app.json accuracy)

---

## Recommended Approach

1. **Download cat_app.json** from ubntwiki once, commit to `src/lib/dpi/cat_app.json`. Import statically — no runtime fetch needed.

2. **Create `src/lib/dpi/lookup.ts`** with `decodeAppId(cat, app)` using the compound formula. Add a unit test for the formula.

3. **Create `src/app/api/dpi/probe/route.ts`** — route-local (not in facade). Pattern: check session → check `UNIFI_MOCK` → POST to stadpi → call `inferStatus()` → call `decodeAppId()` on each app entry → return `{raw, decoded, status}`.

4. **Create `src/app/dpi-probe/page.tsx`** — Client Component. Form input for MAC, submit button calls `fetch('/api/dpi/probe?mac=...')`, displays raw JSON in a `<pre>` block. Include a link back to `/dashboard`.

5. **Update `src/middleware.ts`** — Add `/dpi-probe` to `protectedRoutes` array (one-line change). This ensures unauthenticated users are redirected to `/login`.

6. **Do NOT modify the UniFi client facade** (`client.ts`, `mock.ts`, `index.ts`) — the probe is standalone. Future phases can promote DPI to the facade when production integration begins.

### Why Not the Facade?

The facade pattern (client.ts → mock.ts → index.ts) is appropriate for API calls that multiple consumers use. In Phase 18, only the probe route calls stadpi. Adding a `getDpiStats()` to the facade would require updating 3 files for a validation tool that may be deprecated after Phase 18 confirms the API works. Keep it in the route for now.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/dpi/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DPI-PROBE-01 | `decodeAppId(4, 112)` returns `{appName:"Youtube", catName:"Streaming Media"}` | unit | `npx vitest run src/lib/dpi/lookup.test.ts` | Wave 0 |
| DPI-PROBE-02 | `inferStatus({data:[{}]})` returns `"disabled"` | unit | `npx vitest run src/app/api/dpi/probe/route.test.ts` | Wave 0 |
| DPI-PROBE-03 | `inferStatus({data:[{mac:"...",by_app:[]}]})` returns `"empty"` | unit | same | Wave 0 |
| DPI-PROBE-04 | Mock response: `UNIFI_MOCK=true` → route returns 200 with `{raw,decoded,status:"ok",mock:true}` | unit | same | Wave 0 |
| DPI-PROBE-05 | Unauthenticated request → 401 | unit | same | Wave 0 |
| DPI-PROBE-06 | Missing `mac` param → 400 | unit | same | Wave 0 |
| DPI-PROBE-07 | Compound ID formula correct: `(cat<<16)+app` | unit | `npx vitest run src/lib/dpi/lookup.test.ts` | Wave 0 |
| DPI-PROBE-HW | Probe returns real data on Dream Router 7 | manual only | run app, visit /dpi-probe | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/dpi/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before close

### Wave 0 Gaps

- [ ] `src/lib/dpi/lookup.test.ts` — covers DPI-PROBE-01, DPI-PROBE-07
- [ ] `src/app/api/dpi/probe/route.test.ts` — covers DPI-PROBE-02 through DPI-PROBE-06
- [ ] `src/lib/dpi/cat_app.json` — must be downloaded and committed before tests can run

---

## Project Constraints (from CLAUDE.md)

- Tech stack: Next.js (full-stack), TypeScript, Tailwind CSS, undici for UniFi calls
- Auth: Session cookie checked via `getSession()` in route handlers (middleware excludes `/api/**`)
- `server-only` guard: any module importing `undici` or `process.env` secrets must include `import 'server-only'`
- Test gate: all tests must pass before commit (`npx vitest run`)
- Type check before commit: `npx tsc --noEmit`
- No known broken tests — all new test files must pass
- Mock pattern: `UNIFI_MOCK=true` check is at module init in `index.ts` facade; for standalone probe, check inline in route handler
- Commit author: Faiser / keepbreakfastsimple@gmail.com

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | dynamic.dpi.js on the controller is not fetchable via X-API-KEY (requires browser session or unknown URL) | App ID Lookup | If it IS fetchable, we could get a live/up-to-date lookup instead of a bundled snapshot |
| A2 | X-API-KEY header works on stadpi endpoint (inferred from all other `/proxy/network/api/s/` endpoints) | DPI API Endpoint | Auth would fail; user would see 401 in probe output |
| A3 | Netflix compound ID is 262257 in cat_app.json | Probe Implementation (mock) | Mock shows wrong app name — acceptable for diagnostics |
| A4 | Dream Router 7 with current firmware has stadpi endpoint at the v1 path | DPI API Endpoint | 404 if endpoint moved or renamed; probe shows HTTP status |
| A5 | "DPI disabled" returns `data:[{}]` not `data:[]` | DPI API Endpoint | `inferStatus()` must handle both cases (it does) |

---

## Sources

### Primary (HIGH confidence)
- [unpoller/unifi dpi.go](https://github.com/unpoller/unifi/blob/master/dpi.go) — DPITable/DPIData/DPIClient struct JSON tags (verified field names: `app`, `cat`, `rx_bytes`, `tx_bytes`, `rx_packets`, `tx_packets`, `mac`, `last_updated`, `by_app`, `by_cat`)
- [ubntwiki.com — cat_app_json](https://ubntwiki.com/products/software/unifi-controller/api/cat_app_json) — Full cat_app.json structure confirmed (nested `categories` + `applications` with compound IDs as string keys)
- [ubntwiki.com — UniFi Controller API](https://ubntwiki.com/products/software/unifi-controller/api) — stadpi endpoint, request body format, type=by_app/by_cat, optional macs param

### Secondary (MEDIUM confidence)
- [github.com/unpoller/unpoller issue #834](https://github.com/unpoller/unpoller/issues/834) — "DPI disabled" response shape: `{"meta":{"rc":"ok"},"data":[{}]}`, HTTP 200
- [Art-of-WiFi Client.php](https://github.com/Art-of-WiFi/UniFi-API-client/blob/master/src/Client.php) — `list_dpi_stats_filtered()` method: POST to `stat/sitedpi` with `{type, cats}`; compound ID formula `(cat<<16)+app` referenced
- [rwaight.github.io UniFi API docs](https://rwaight.github.io/random/unifi/ubntwiki/unifi-controller-api/) — DPI category code table (0-255)

### Tertiary (LOW confidence — needs live-hardware verification)
- dynamic.dpi.js URL on running controller — NOT FOUND in any source
- Minimum firmware version for stadpi on Dream Router 7 — NOT DOCUMENTED
- Netflix/Zoom/Discord exact compound IDs — inferred from compound formula, not verified against actual cat_app.json content

---

## Live Hardware Validation — 2026-07-18

**Result: stadpi endpoint does not return data on current firmware.**

Two tests were run against the live Dream Router (UniFi OS / Network 9.x):

| Test | MAC | Response |
|------|-----|----------|
| Idle device | real MAC | `{"meta":{"rc":"ok"},"data":[]}` |
| Actively-trafficked device | real MAC | `{"meta":{"rc":"ok"},"data":[]}` |

Both return `data: []` (empty array) with `meta.rc: "ok"`. The endpoint is reachable and authenticated (no 401/403/404), but returns no data regardless of device activity.

**Conclusion:** The `stat/stadpi` v1 endpoint is non-functional on this firmware. The feature may have been migrated to a different API path (likely under the v2 API surface at `/proxy/network/v2/api/...`), or Traffic Identification may route data through a different internal mechanism in UniFi OS 9.x. The "DPI disabled" UI setting path has also moved — the old "Settings → Traffic Management → Deep Packet Inspection" toggle no longer exists in the current interface.

**Impact on future DPI integration:** The planned dashboard integration (per-device top apps) is blocked until the correct API path on current firmware is identified. The recommended next step is to intercept the network calls made by the UniFi web UI's Traffic tab for a client to discover what endpoint it actually calls.

**The probe tool served its purpose:** it confirmed the API is reachable and authenticated before any production integration was built.

---

## Metadata

**Confidence breakdown:**
- stadpi endpoint URL/method/body: HIGH — confirmed across multiple community sources
- Response field names: HIGH — verified from unpoller Go struct JSON tags
- "DPI disabled" response shape: MEDIUM — single issue report, HTTP 200 confirmed
- App ID compound formula: HIGH — consistent across Art-of-WiFi PHP, unpoller Go, ubntwiki
- cat_app.json structure: HIGH — fetched and confirmed from ubntwiki
- dynamic.dpi.js runtime URL: LOW — not found; recommend static bundle
- Auth mechanism (X-API-KEY on stadpi): MEDIUM — inferred from consistent auth pattern
- stadpi data on firmware 9.x: CONFIRMED NON-FUNCTIONAL — live hardware test 2026-07-18

**Research date:** 2026-07-18
**Hardware validation:** 2026-07-18 — stadpi returns `data:[]` on all MACs on UniFi OS/Network 9.x
**Valid until:** N/A — stadpi confirmed non-functional; revisit requires discovery of v2 DPI endpoint
