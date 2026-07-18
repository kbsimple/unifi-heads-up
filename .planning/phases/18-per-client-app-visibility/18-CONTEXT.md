# Phase 18: Per-Client App Visibility (DPI) - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a small, isolated DPI probe tool — a diagnostic API endpoint + lightweight page
that queries the UniFi DPI API directly and displays raw results. The goal is to
validate that the endpoint is accessible, what it returns, and what app ID decoding
looks like on the user's actual hardware BEFORE any dashboard integration is built.

**Not in scope for Phase 18:** dashboard integration, snapshot recording, delta
computation, any production UI in the expanded device row. Those come in a future
phase once the probe confirms the API works.

</domain>

<decisions>
## Implementation Decisions

### Probe-first approach (LOCKED — user decision)
Phase 18 delivers a validation tool only. Full DPI integration into the dashboard
is explicitly deferred until the probe confirms the UniFi DPI API is reachable and
returns useful data on the user's hardware.

### Probe surface (Claude's Discretion)
- `GET /api/dpi/probe?mac={mac}` — server route that calls the UniFi stadpi endpoint
  and returns raw JSON (no transformation). Also attempts to fetch the app ID lookup
  so we can see both the data and the decode table in one request.
- `/dpi-probe` page — simple form: enter a MAC address, submit, see the raw API
  response formatted as JSON. No auth UX polish needed — this is a diagnostic tool.
- Page should be accessible without navigating through the dashboard (direct URL).
- Auth: require session (same as other dashboard routes) so API key isn't exposed
  to unauthenticated users.

### Mock mode behavior (Claude's Discretion)
When `UNIFI_MOCK=true`, the probe route should return a realistic mock DPI response
so the probe page is testable in dev without a real UniFi console.

### No snapshot recording in Phase 18 (LOCKED)
No `dpi_snapshots` table, no recorder, no delta math. Raw API call only.

### No integration into client-table.tsx (LOCKED)
The expanded device row is not touched in Phase 18.

</decisions>

<specifics>
## Known Research (from STATE.md Future Extensions, 2026-05-17)

- **API endpoint:** `POST /proxy/network/api/s/default/stat/stadpi`
  Body: `{"type":"by_app","macs":["aa:bb:cc:dd:ee:01"]}`
  Returns: cumulative per-app byte counts keyed by numeric app ID
- **Hardware:** Dream Machine series required (confirmed on Dream Router 7)
- **Prerequisite:** DPI enabled in Settings → Traffic Management → Deep Packet Inspection
- **App ID decode:** Numeric IDs → app names via `dynamic.dpi.js` on the controller
  (fetch once, cache). Exact path and format need live-hardware verification.
- **Note:** Byte counts are cumulative totals (not deltas) — raw probe output will show
  totals, which is fine for validation purposes.

## What the probe needs to confirm
1. Does the stadpi endpoint exist and respond on this firmware version?
2. What does the response JSON actually look like?
3. Can we fetch the app ID → name lookup table? What's its structure?
4. Are there any auth or permission errors?

</specifics>

<deferred>
## Deferred to Future Phase

- `dpi_snapshots` SQLite table + periodic recorder
- Delta computation (bytes in window = latest snapshot − oldest snapshot in range)
- Dashboard integration (expanded row "Top Apps" section)
- Time-window selector integration
- App icon support
- All UI design decisions (count, layout, fallback) — deferred until probe validates

</deferred>
