---
quick_id: 260717-lbr
slug: last-busy-refresh
description: Fix Last Busy column not refreshing on page load
date: 2026-07-17
---

# Quick Task 260717-lbr: Fix Last Busy column not refreshing on page load

## Root Cause

Three layered bugs cause the Last Busy column to show stale/null values:

1. **`dashboard/page.tsx`** calls `getUnifiClients()` directly — this returns `lastBusy: null` for
   all clients. Only the `/api/clients` route enriches via `enrichWithLastBusy`. So the server-side
   `initialData` always has null, meaning the first render always shows `—`.

2. **`client-table.tsx`** reads `lastBusy` exclusively from the context ref (`getClientLastBusy`),
   ignoring `client.lastBusy` from the SWR data. The SWR data (from `/api/clients`) DOES have the DB
   value — but the table never reads it.

3. **`traffic-history-context.tsx`** seeds `lastBusyRef` on first poll but doesn't call
   `setSampleCount` after seeding — so there's no guaranteed re-render to expose the seeded values to
   the table.

## Tasks

### Task 1: Enrich initialData in DashboardPage
**File:** `src/app/dashboard/page.tsx`
**Action:** After calling `getUnifiClients()`, call `queryAllLastBusy(getDb())` and enrich clients
with the DB lastBusy values so the first render already has correct data.
**Verify:** Server-rendered HTML contains lastBusy timestamps for active devices.

### Task 2: Use max(context, client.lastBusy) in ClientTable
**File:** `src/components/dashboard/client-table.tsx`
**Action:**
- Line 174: Replace `const lastBusy = getClientLastBusy(client.id)` with
  `const lastBusy = Math.max(getClientLastBusy(client.id) ?? 0, client.lastBusy ?? 0) || null`
- Fix `compareByColumn` for `lastBusy` sort: use
  `Math.max(getClientLastBusy(a.id) ?? 0, a.lastBusy ?? 0)` and same for `b`.
**Verify:** Both cell display and sort use the most recent of context + API values.

### Task 3: Trigger re-render after DB seed in context
**File:** `src/contexts/traffic-history-context.tsx`
**Action:** In the `dbSeededRef` block (lines 93-100), after the seed loop, call
`setSampleCount(c => c + 1)` if any value was seeded (use a `seeded` boolean flag).
**Verify:** Context re-renders immediately when DB values arrive, pushing update to consumers.

### Task 4: Run tests + type-check + commit
**Action:** `npx vitest run` must pass with no new failures. `npx tsc --noEmit` must pass.
Commit code changes (3 files) with message:
`fix(dashboard): last-busy column refreshes on page load and uses DB-sourced values`
