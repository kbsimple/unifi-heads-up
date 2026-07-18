---
quick_id: 260717-trs
slug: time-range-selector
description: Add discrete time-range selector to site and per-device traffic charts
date: 2026-07-17
---

# Quick Task 260717-trs: Time-Range Selector for Traffic Charts

## Design

Six window options: 5m / 30m / 1h / 3h / 12h / 24h. Bucket granularity per window:
- 5m → 60s buckets (5 points)
- 30m → 60s buckets (30 points)
- 1h → 300s buckets (12 points)
- 3h → 300s buckets (36 points)
- 12h → 900s buckets (48 points)
- 24h → 3600s buckets (24 points)

X-axis labels: sub-hourly windows use "H:MM PM", hourly uses "H PM".

## Tasks

### Task 1: Extend queries.ts
- Rename `HistoryBucket.hourTs` → `HistoryBucket.bucketTs` (all uses updated too)
- Export `bucketSecondsForWindow(windowMinutes): number`
- Add `queryDeviceHistoryRecent(db, mac, windowMinutes): HistoryBucket[]` — integer-division
  bucketing on recorded_at, fills gaps with 0, default window=1440 replaces queryDeviceHistory
- Add `querySiteHistoryRecent(db, windowMinutes): HistoryBucket[]` — same but aggregates
  across all MACs (SUM instead of WHERE mac=?)

### Task 2: Add formatBucketLabel to format.ts
- `formatBucketLabel(unixSec, bucketSec): string`
  — bucketSec >= 3600 → delegates to `formatPacificHour` ("3 PM")
  — else → Intl.DateTimeFormat with minute: '2-digit' ("3:05 PM")

### Task 3: Update /api/insights/device-history route
- Add `?window=5|30|60|180|720|1440` param (default 1440)
- Validate against VALID_WINDOWS; 400 on invalid
- Call `queryDeviceHistoryRecent` instead of `queryDeviceHistory`

### Task 4: New /api/insights/site-history route
- `GET /api/insights/site-history?window=5|30|60|180|720|1440`
- Calls `querySiteHistoryRecent`
- Auth gated (session check)

### Task 5: Add WindowSelector to traffic-chart.tsx
- Export `WindowSelector({ value, onChange })` component — 6 compact buttons
- Export `WINDOW_OPTIONS` constant (used by both callers)

### Task 6: Update client-table.tsx
- `historyWindow` state (default 1440), shared across all expanded rows
- Cache key: `${mac}:${historyWindow}` (was: `mac`)
- `WindowSelector` in expanded row header
- Fetch URL: `?mac=X&window=${historyWindow}`
- `chartData`: `formatBucketLabel(b.bucketTs, bucketSecondsForWindow(historyWindow))`
- `historyLoading` key remains `mac` (only one row expanded at a time)
- useEffect dep: `cacheKey` (= `${expandedMac}:${historyWindow}`)

### Task 7: Update client-card.tsx
- `historyWindow` state (default 1440)
- Reset `dbHistory` to null on window change (useEffect on historyWindow)
- `WindowSelector` inside history panel (shown when showHistory=true)
- Fetch URL includes `&window=${historyWindow}`
- `chartData` uses `formatBucketLabel(b.bucketTs, bucketSecondsForWindow(historyWindow))`

### Task 8: Update client-list.tsx (site chart)
- `siteWindow` state (default 1440)
- `useEffect`: fetch from `/api/insights/site-history?window=X` when siteWindow !== 1440
- `siteChartData`: context data for 24hr, API data for shorter windows
- Title: "Site Traffic" (remove "(24h)" — window shown by active button)
- `WindowSelector` in chart card header
- Show condition: `isHistoryAvailable || siteWindow !== 1440`

### Task 9: Fix tests
- `client-card-history.test.tsx`: rename `hourTs` → `bucketTs` in mock data/local type
- `client-list-site-history.test.tsx`: update regex from `/Site Traffic \(24h\)/i` to `/Site Traffic/i`
- `queries.test.ts`: add unit tests for `queryDeviceHistoryRecent` and `querySiteHistoryRecent`
- Run full suite; fix any remaining failures

### Task 10: Type-check + commit
- `npx tsc --noEmit` (pre-existing errors ok; no new ones from our files)
- `npx vitest run` — all 329+ tests pass
- Commit: `feat(dashboard): discrete time-range selector for traffic charts`
