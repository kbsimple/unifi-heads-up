---
quick_id: 260717-trs
slug: time-range-selector
status: complete
date: 2026-07-17
commit: 8e48aed
---

# Summary: 260717-trs Time-Range Selector for Traffic Charts

## What shipped

Six window buttons (5m / 30m / 1h / 3h / 12h / 24h) added to both the
site-wide traffic chart and per-device history panels. Each window uses
variable bucket granularity so the chart has a useful number of data
points at every zoom level.

## Files changed

| File | Change |
|------|--------|
| `src/lib/insights/queries.ts` | Renamed `hourTs` → `bucketTs`; added `VALID_WINDOWS`, `bucketSecondsForWindow`, `queryDeviceHistoryRecent`, `querySiteHistoryRecent`; fixed SQLite REAL-division bug with `CAST(? AS INTEGER)` |
| `src/lib/unifi/format.ts` | Added `formatBucketLabel(unixSec, bucketSec)` |
| `src/app/api/insights/device-history/route.ts` | Added `?window` param, calls `queryDeviceHistoryRecent` |
| `src/app/api/insights/site-history/route.ts` | New endpoint — aggregated site bandwidth by window |
| `src/components/dashboard/traffic-chart.tsx` | Exported `WindowSelector` component and `WINDOW_OPTIONS` |
| `src/components/dashboard/client-table.tsx` | Per-device `historyWindow` state, cache key `mac:window`, `WindowSelector` in expanded row |
| `src/components/dashboard/client-card.tsx` | Per-device `historyWindow` state with reset-then-fetch sequencing |
| `src/components/dashboard/client-list.tsx` | Site chart `siteWindow` state, dynamic fetch vs context data, title "Site Traffic" |
| `tests/components/dashboard/client-card-history.test.tsx` | `hourTs` → `bucketTs` in mock data |
| `tests/components/dashboard/client-list-site-history.test.tsx` | Updated title regex to `/Site Traffic/i` |
| `tests/lib/insights/queries.test.ts` | Added 11 tests for `queryDeviceHistoryRecent` and `querySiteHistoryRecent` |

## Bug found and fixed

`better-sqlite3` binds JavaScript integer literals as SQLite `REAL`, so
`(recorded_at / ?) * ?` was doing floating-point division (giving back
the original value instead of a rounded bucket). Fixed with
`CAST(? AS INTEGER)` in both query functions. Also added
`CAST(strftime('%s','now') AS INTEGER)` for consistency.

## Tests

337/337 passing. No new TypeScript errors.
