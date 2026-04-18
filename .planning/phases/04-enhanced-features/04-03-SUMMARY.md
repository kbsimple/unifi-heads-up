---
phase: 04-enhanced-features
plan: 03
subsystem: traffic-history-visualization
tags: [recharts, context, swr, traffic-history, client-card, area-chart]
dependency_graph:
  requires: [recharts@3.8.1, useSWR, ClientCard, ClientList, NetworkClient]
  provides: [TrafficHistoryProvider, useTrafficHistory, TrafficChart, expandable-history-panel, site-traffic-section]
  affects:
    - src/components/dashboard/client-card.tsx
    - src/components/dashboard/client-list.tsx
tech_stack:
  added: []
  patterns: [react-context-accumulation, swr-side-effect, hourly-aggregation, use-ref-storage]
key_files:
  created:
    - src/contexts/traffic-history-context.tsx
    - src/components/dashboard/traffic-chart.tsx
  modified:
    - src/components/dashboard/client-card.tsx
    - src/components/dashboard/client-list.tsx
    - tests/components/dashboard/client-card.test.tsx
    - tests/components/dashboard/client-list.test.tsx
decisions:
  - Use useRef (not useState) for minuteSamples and hourlyBuckets to avoid re-renders on every SWR poll
  - TrafficHistoryProvider subscribes to its own SWR instance (onSuccess callback) rather than receiving data as props
  - ClientList split into ClientListInner + ClientList wrapper so TrafficHistoryProvider wraps the hook consumers
  - formatHourLabel exported from traffic-chart.tsx for reuse in client-list.tsx and client-card.tsx
  - Test SWR mock uses double mockReturnValueOnce (first for provider, second for ClientListInner)
metrics:
  duration: ~12min
  completed: "2026-04-18T20:05:00Z"
  tasks_completed: 4
  files_changed: 6
---

# Phase 04 Plan 03: Traffic History Visualization Summary

**One-liner:** Recharts AreaChart traffic history with hourly aggregation context, sky-600 gradient, per-client expandable panels, and site-wide 24h trend section.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create TrafficHistoryContext | 911159a | src/contexts/traffic-history-context.tsx |
| 2 | Create TrafficChart component | ffae4fc | src/components/dashboard/traffic-chart.tsx |
| 3 | Add expandable history panel to ClientCard | ed0ffb1 | src/components/dashboard/client-card.tsx |
| 4 | Add site traffic section to Dashboard + wrap with provider | 8eae7ee | src/components/dashboard/client-list.tsx, traffic-chart.tsx |
| - | Fix tests for TrafficHistoryProvider wrapping | 41c0691 | tests/components/dashboard/client-card.test.tsx, client-list.test.tsx |

## What Was Built

- **`src/contexts/traffic-history-context.tsx`** — `TrafficHistoryProvider` accumulates 60-second `MinuteSample` snapshots from SWR `/api/clients` polling. Aggregates samples into `HourlySample` buckets (avgDownload, avgUpload, sampleCount) using `useRef` storage. Limits to 24 hourly buckets per threat model T-04-05. Provides `siteHistory`, `getClientHistory(clientId)`, and `isHistoryAvailable` via `useTrafficHistory` hook.

- **`src/components/dashboard/traffic-chart.tsx`** — `TrafficChart` wraps Recharts `AreaChart` with sky-600 gradient fill (`#0ea5e9`, 30% to 0%), Y-axis in Mbps, X-axis hourly labels, dark theme tooltip (`bg-zinc-900`/`border-zinc-800`). `ResponsiveContainer` at 200px height. `formatHourLabel(timestamp)` helper exported. `aria-label` for accessibility.

- **`src/components/dashboard/client-card.tsx`** — Converted to client component. Added `showHistory` state toggle with `aria-expanded`. "View History" button fetches client history via `getClientHistory(client.id)`, transforms `HourlySample[]` to chart data, renders `TrafficChart` or empty state message.

- **`src/components/dashboard/client-list.tsx`** — Split into `ClientListInner` (hook consumer) + `ClientList` wrapper (provides `TrafficHistoryProvider`). Site Traffic (24h) `Card` section appears above device list when `isHistoryAvailable` is true, showing `TrafficChart` with aggregated site bandwidth.

## Verification

- 137 tests passed (24 test files) — all tests green
- Build: `next build` compiles successfully with no TypeScript errors
- All acceptance criteria verified via grep

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Recharts Tooltip `formatter` TypeScript error**
- **Found during:** Task 4 (build check)
- **Issue:** `formatter={(value: number) => ...}` — Recharts `ValueType` can be `undefined`, causing TS error
- **Fix:** Changed to `formatter={(value) => typeof value === 'number' ? ...}` guard
- **Files modified:** `src/components/dashboard/traffic-chart.tsx`
- **Commit:** 8eae7ee

**2. [Rule 1 - Bug] Updated tests broken by TrafficHistoryProvider wrapping**
- **Found during:** Post-task test run
- **Issue:** `ClientCard` tests failed because `useTrafficHistory` throws outside provider. `ClientList` error/loading tests failed because `mockReturnValueOnce` was consumed by `TrafficHistoryProvider`'s SWR call, not `ClientListInner`'s.
- **Fix:** Wrapped `ClientCard` tests with `TrafficHistoryProvider`. Used double `mockReturnValueOnce` in `ClientList` tests (first for provider SWR, second for inner list SWR).
- **Files modified:** `tests/components/dashboard/client-card.test.tsx`, `tests/components/dashboard/client-list.test.tsx`
- **Commit:** 41c0691

## Known Stubs

None — history accumulation works from first SWR poll. Charts render as soon as hourly buckets accumulate. Empty state shown until then per design spec.

## Threat Flags

None — all traffic data is client-side only (browser memory), no new network endpoints introduced. Memory exhaustion mitigated per T-04-05 (24 bucket limit enforced in context).

## Self-Check: PASSED

Files exist:
- src/contexts/traffic-history-context.tsx: FOUND
- src/components/dashboard/traffic-chart.tsx: FOUND
- src/components/dashboard/client-card.tsx: modified, has 'use client', useTrafficHistory, View History
- src/components/dashboard/client-list.tsx: modified, has TrafficHistoryProvider, Site Traffic (24h)

Commits exist:
- 911159a: FOUND
- ffae4fc: FOUND
- ed0ffb1: FOUND
- 8eae7ee: FOUND
- 41c0691: FOUND
