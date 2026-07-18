---
quick_id: 260717-dab
slug: dashboard-activity-bugs
status: complete
date: 2026-07-17
commits:
  - e34daaa
  - cd12916
---

# Quick Task 260717-dab: Fix Two Dashboard Activity Monitoring Bugs

## What was done

### Bug 1: rx/tx field mapping swap (e34daaa)
- `src/lib/unifi/client.ts`: swapped `downloadRate` to use `tx_bytes-r` and `uploadRate` to use `rx_bytes-r`
- From the AP's frame of reference, `rx` = received FROM device (device upload), `tx` = transmitted TO device (device download). The previous mapping was inverted.
- `trafficStatus` calculation is unaffected — it sums both values

### Bug 2: DB-backed Last Busy column (cd12916)
- Added `lastBusy: number | null` to `NetworkClient` interface
- Added `queryAllLastBusy(db)` to `queries.ts` — queries snapshots for `MAX(recorded_at)` where `download_bps + upload_bps >= 125000 bytes/sec` (1 Mbps combined)
- `enrichWithLastBusy()` in `/api/clients` route enriches every client response with DB-sourced lastBusy keyed by MAC
- `TrafficHistoryContext` seeds `lastBusyRef` from `client.lastBusy` on first poll, then updates from session observations (taking the max so neither overwrites a more-recent value)
- Updated mock clients with realistic lastBusy timestamps for dev mode
- Updated 10 test files to include `lastBusy: null` in NetworkClient fixtures

## Tests
- 319/319 passing
- 0 new TypeScript errors
