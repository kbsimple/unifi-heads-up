---
quick_id: 260717-lbr
slug: last-busy-refresh
status: complete
date: 2026-07-17
commits:
  - b15c698
---

# Quick Task 260717-lbr: Fix Last Busy column not refreshing on page load

## Root Cause

Three layered bugs — all fixed:

1. `DashboardPage` called `getUnifiClients()` directly, which returns `lastBusy: null` for all
   clients. Only the `/api/clients` route enriches with DB values. Server-rendered `initialData`
   therefore always had null lastBusy, causing the initial render to show `—` for every device.

2. `ClientTable` read `lastBusy` exclusively from the context ref (`getClientLastBusy`), ignoring
   `client.lastBusy` from the SWR data. The SWR API response DOES include enriched DB values, but
   the table never used them directly.

3. `TrafficHistoryContext` seeded `lastBusyRef` on first poll but didn't call `setSampleCount` after
   seeding — no state change, no re-render, so consumers didn't know to re-read the ref.

## Changes

### `src/app/dashboard/page.tsx`
Added `queryAllLastBusy(getDb())` call immediately after `getUnifiClients()`. Enriches all
`initialData` clients with DB `lastBusy` values before passing to `<ClientList>`. Now the very first
server-side render has correct values.

### `src/components/dashboard/client-table.tsx`
- **Cell display** (line 174): `Math.max(getClientLastBusy(client.id) ?? 0, client.lastBusy ?? 0) || null`
  — takes whichever source is more recent. `client.lastBusy` comes from the SWR API response and
  updates on every 60s poll, so the column always reflects the freshest DB value.
- **Sort comparator** for `lastBusy` column: same max calculation, keeps sort consistent with display.

### `src/contexts/traffic-history-context.tsx`
After the DB seed loop, added a `seeded` boolean flag. If any value was seeded, calls
`setSampleCount(c => c + 1)` to force a context re-render, immediately pushing the new values to
all consumers.

## Result

329/329 tests passing. No new TypeScript errors. The Last Busy column now:
- Populates on the initial server-rendered page load (DB values in `initialData`)
- Refreshes every 60 seconds via SWR as `client.lastBusy` updates
- Picks up in-session activity (context ref) when a device goes medium/high during a session
- Takes the most recent of all sources, so no source can regress a more-recent timestamp
