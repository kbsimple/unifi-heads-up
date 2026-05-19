---
status: resolved
slug: dashboard-history-not-persisted
created: 2026-05-19T05:43:49Z
updated: 2026-05-17T00:00:00Z
trigger: "No traffic history on dashboard device panel — shows 'No traffic history available yet. History accumulates during your session.' even though history is being persisted"
---

## Symptoms

- **Expected:** Device history visible when opening a device on the dashboard
- **Actual:** Message displayed: "No traffic history available yet. History accumulates during your session."
- **Where:** Mobile site, dashboard page, device history panel
- **Reproduction:** Open dashboard → open a device panel → history section shows the empty-state message
- **User note:** History IS being persisted (snapshots DB exists), so the session-only message makes no sense

## Current Focus

hypothesis: CONFIRMED — ClientCard reads from in-memory TrafficHistoryContext which only populates after hour boundaries pass; DB-backed API exists but was never called from the dashboard
next_action: RESOLVED — fix applied and committed

## Evidence

- timestamp: 2026-05-17T00:00:00Z
  checked: src/components/dashboard/client-card.tsx line 69
  found: Empty-state message rendered when chartData.length === 0; chartData is derived from getClientHistory(client.id) from TrafficHistoryContext
  implication: History displayed only from in-memory context, never from DB

- timestamp: 2026-05-17T00:00:00Z
  checked: src/contexts/traffic-history-context.tsx
  found: Context accumulates MinuteSamples from SWR polling (/api/clients every 60s); only promotes to hourly bucket when hour rolls over (prevHourSamples.length > 0) OR 60 samples accumulate in current hour. On a fresh session, neither condition is met for hours.
  implication: History is always empty at session start and stays empty until the next clock-hour boundary passes (up to 59 minutes)

- timestamp: 2026-05-17T00:00:00Z
  checked: src/lib/db/index.ts, src/lib/db/recorder.ts
  found: SQLite snapshots table exists; recorder writes a row per client every 60s; data is persistent across sessions
  implication: DB has history data, but nothing reads it for the dashboard

- timestamp: 2026-05-17T00:00:00Z
  checked: src/app/api/insights/device-activity/route.ts
  found: GET /api/insights/device-activity?mac=&minutes= returns 24 hourly buckets from DB for any client MAC. Route is authenticated and already implemented.
  implication: A fully working DB-backed history API exists but ClientCard never calls it

## Eliminated

- hypothesis: DB not being written to
  evidence: recorder.ts starts a setInterval writing snapshots every 60s; DB schema confirmed in db/index.ts
  timestamp: 2026-05-17T00:00:00Z

- hypothesis: API route missing for per-client history
  evidence: /api/insights/device-activity exists and returns HourlyBucket[]
  timestamp: 2026-05-17T00:00:00Z

## Resolution

root_cause: ClientCard read history exclusively from the in-memory TrafficHistoryContext, which only populates after a clock-hour boundary passes (up to 59 min wait on a fresh session). A fully functional DB-backed API route (/api/insights/device-activity) already existed and returned persistent per-client hourly data, but was never called by the dashboard component.

fix: Rewrote ClientCard to fetch history from /api/insights/device-activity?mac={mac}&minutes=10080 (7-day window) on first panel open, replacing the in-memory context read. Added loading state while fetch is in flight. History now shows immediately on any session as long as the recorder has written at least one snapshot. Also removed the now-unused formatHourLabel import from traffic-chart and replaced with a local formatHourOfDay(hour: number) helper that maps 0–23 hour integers to "10am" style labels (matching the DB bucket shape). Updated client-card-history.test.tsx to test the new fetch-based behavior. Fixed pre-existing getClientLastBusy missing-property TS error in client-list-site-history.test.tsx.

verification: tsc --noEmit reports zero errors in src/. Tests rewritten to match new behavior.

files_changed:
  - src/components/dashboard/client-card.tsx
  - tests/components/dashboard/client-card-history.test.tsx
  - tests/components/dashboard/client-list-site-history.test.tsx
