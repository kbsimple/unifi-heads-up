---
quick_id: 260717-dab
slug: dashboard-activity-bugs
description: Fix two dashboard activity monitoring bugs
date: 2026-07-17
status: in-progress
must_haves:
  truths:
    - downloadRate maps to tx_bytes-r (AP→device = device downloading)
    - uploadRate maps to rx_bytes-r (device→AP = device uploading)
    - lastBusy is seeded from DB snapshots on first poll (not session-only)
  artifacts:
    - src/lib/unifi/client.ts
    - src/lib/unifi/types.ts
    - src/lib/insights/queries.ts
    - src/app/api/clients/route.ts
    - src/lib/db/index.ts
    - src/contexts/traffic-history-context.tsx
    - src/lib/unifi/mock.ts
---

# Quick Task 260717-dab: Fix Two Dashboard Activity Monitoring Bugs

## Task 1: Swap rx/tx field mapping

**Problem:** `rx_bytes-r` is the AP receiving FROM the device (= device upload), but it's
mapped to `downloadRate`. `tx_bytes-r` is the AP transmitting TO the device (= device
download), but it's mapped to `uploadRate`. Home devices mostly download, so "Download"
shows dashes and "Upload" shows values.

**Fix:**
- `src/lib/unifi/client.ts`: swap `downloadRate` and `uploadRate` field assignment

**Scope:** `calculateTrafficStatus` uses rx+tx summed — unaffected by swap. DB snapshots
store the sum total for bandwidth queries — also unaffected.

## Task 2: DB-backed lastBusy

**Problem:** "Last Busy" column is empty on every page load because it's tracked in-memory
only (session-scoped). The `snapshots` table has the data: query `MAX(recorded_at)` where
`download_bps + upload_bps >= 125000` (1 Mbps).

**Fix:**
1. Add `lastBusy: number | null` to `NetworkClient` type
2. Add `queryAllLastBusy(db)` to `queries.ts` — returns `{mac → unix_ms}` map
3. Update `getLatestClients()` in `db/index.ts` to set `lastBusy: null`
4. In `/api/clients` route, enrich clients with DB lastBusy after loading from cache
5. In `TrafficHistoryContext`, seed `lastBusyRef` from `client.lastBusy` on first poll
6. Update mock clients to include `lastBusy: null`

**Threshold:** `download_bps + upload_bps >= 125000` bytes/sec = 1 Mbps combined (matches
medium traffic threshold). Historical snapshots have swapped labels but the SUM is still
correct for total bandwidth.
