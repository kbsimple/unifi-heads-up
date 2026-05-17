---
phase: 10-insights-page
plan: "03"
subsystem: insights-ui
tags: [recharts, swr, client-components, heatmap, insights]
dependency_graph:
  requires:
    - src/components/insights/insights-shell.tsx
    - GET /api/insights/top-devices
    - GET /api/insights/device-activity
  provides: [Interactive Insights page at /dashboard/insights]
  affects: []
tech_stack:
  added: []
  patterns: [Recharts BarChart layout=vertical, SWR with refreshInterval=0, inline CSS grid for 24 columns]
key_files:
  created:
    - src/components/insights/insights-shell.tsx
    - src/components/insights/top-devices-chart.tsx
    - src/components/insights/device-activity-heatmap.tsx
  modified:
    - src/app/dashboard/insights/page.tsx
decisions:
  - Native <select> used instead of shadcn Select (component not available in this project)
  - BarRectangleItem.payload typed as any to access mac from Recharts click handler
  - Inline CSS grid style used for 24-column heatmap (Tailwind v4 has no grid-cols-24)
metrics:
  completed: 2026-05-16
  tasks: 3 (+ 1 pending human-verify checkpoint)
  files: 4
---

# Phase 10 Plan 03: Insights Client Components Summary

Interactive Insights page with time-range tabs, ranked horizontal bar chart, and 24-column hourly activity heatmap.

## What Was Built

- **InsightsShell**: `'use client'` container with 7d/14d/30d tab control, SWR fetches for both endpoints, `selectedMac` state with auto-select of top device on load, days-change resets selection
- **TopDevicesChart**: Recharts horizontal `BarChart` (`layout="vertical"`), click-to-select device, selected bar highlighted sky-400 vs default sky-500, empty state message, bytes formatter (MB/GB)
- **DeviceActivityHeatmap**: 24-column inline CSS grid, 5-level color scale (idle→peak), device dropdown selector, hour labels (0,3,6,...,21), color legend
- **page.tsx**: Server Component updated to mount `<InsightsShell />` replacing static skeletons

## Deviations from Plan

**1. [Rule 2 - Missing] Native select instead of shadcn Select**
- **Found during:** Task 2
- **Issue:** `src/components/ui/select.tsx` does not exist in this project; shadcn Select was not installed
- **Fix:** Used native `<select>` element with matching dark-theme styling (bg-zinc-800, border-zinc-700, text-zinc-200)
- **Files modified:** src/components/insights/device-activity-heatmap.tsx

**2. [Rule 1 - Bug] Recharts Bar onClick type mismatch**
- **Found during:** Task 1 (tsc check)
- **Issue:** Bar `onClick` prop expects `BarMouseEvent = (data: BarRectangleItem, index, event) => void`; passing `(entry: TopDevice)` caused TS2322
- **Fix:** Updated handler to `(data: BarRectangleItem) => { const mac = (data.payload as TopDevice)?.mac; ... }` and imported `BarRectangleItem` from recharts
- **Files modified:** src/components/insights/top-devices-chart.tsx

## Known Stubs

None — all data flows from real API endpoints.

## Threat Flags

None — no new network endpoints or auth paths introduced beyond Plan 01 API routes.

## Awaiting Human Checkpoint

Plan 10-03 Task 4 is a `checkpoint:human-verify` gate. The automated implementation is complete and TypeScript-clean. Human verification of the interactive UI is pending.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Tasks 1+2 | 769bf01 | feat(10-03): add InsightsShell, TopDevicesChart, DeviceActivityHeatmap |
| Task 3 | 243e9db | feat(10-03): wire InsightsShell into insights page |

## Self-Check: PASSED
