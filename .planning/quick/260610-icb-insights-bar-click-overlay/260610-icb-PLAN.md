---
quick_id: 260610-icb
slug: insights-bar-click-overlay
description: "Fix insights tab bar chart — clicking a bar shows white overlay rectangles and does nothing useful"
date: 2026-06-10
status: complete
must_haves:
  truths:
    - "No white rectangle overlay appears when hovering or clicking a bar in the insights chart"
    - "Clicking a bar still highlights it (Cell fill color changes)"
  artifacts:
    - "src/components/insights/top-devices-chart.tsx"
---

## Quick Task 260610-icb

**Goal:** Fix the Recharts default cursor and activeBar visual overlays that appear on the insights tab bar chart when a bar is clicked — these look like broken UI and serve no purpose since selection is already communicated via fill color.

## Tasks

### Task 1: Disable Recharts default cursor and activeBar overlays

- **File:** `src/components/insights/top-devices-chart.tsx`
- **Action:** Add `cursor={false}` to `<BarChart>` and `activeBar={false}` to `<Bar>`
- **Verify:** Click a bar — no white overlay rectangles appear; selected bar fill still changes
- **Done:** Fix committed at `21d36c0`

## Root Cause (from debug session)

Recharts `BarChart` renders a semi-transparent white rectangle (cursor) over the full chart area on hover/click by default. `Bar` renders a white stroke outline (activeBar) around the clicked bar by default. Neither was disabled, and neither serves a purpose since `Cell` fill color already communicates selection state.

**Debug session:** `.planning/debug/insights-bar-click-overlay.md`
