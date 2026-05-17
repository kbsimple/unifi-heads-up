---
phase: 11-firewall-rule-scheduling
plan: "02"
subsystem: frontend
tags: [firewall, scheduling, components, rtl-tests, popover]
dependency_graph:
  requires:
    - scheduleEnd on FirewallPolicy (11-01)
    - POST /api/firewall/schedule (11-01)
    - DELETE /api/firewall/schedule (11-01)
  provides:
    - SchedulePicker client component (schedule-picker.tsx)
    - ScheduleBadge client component (schedule-badge.tsx)
    - FirewallCard augmented with schedule UI
    - RTL tests for SchedulePicker (14 tests, all passing)
  affects:
    - FirewallCard visual layout (schedule clock + expiry row)
tech_stack:
  added:
    - "@base-ui/react Popover (via shadcn add popover)"
  patterns:
    - base-ui Popover (no asChild — PopoverTrigger renders as button natively)
    - RuleToggle pending pattern replicated exactly (opacity-50, disabled, finally block)
    - Mock base-ui Popover inline in tests to avoid portal/jsdom issues
key_files:
  created:
    - src/components/firewall/schedule-picker.tsx
    - src/components/firewall/schedule-badge.tsx
    - src/components/ui/popover.tsx
    - tests/components/firewall/schedule-picker.test.tsx
  modified:
    - src/components/firewall/firewall-card.tsx
decisions:
  - "shadcn popover uses @base-ui/react not Radix — PopoverTrigger has no asChild prop; trigger is a native button, so the inner clock <button> was replaced with Clock icon directly inside PopoverTrigger"
  - "Test C2 uses container.firstElementChild to find the outermost opacity-50 wrapper instead of trigger.closest('div') — the mocked Popover adds an intermediate div that breaks closest() traversal"
metrics:
  duration: "2 minutes"
  completed_date: "2026-05-17"
  tasks_completed: 3
  files_changed: 5
---

# Phase 11 Plan 02: Firewall Rule Scheduling UI Summary

**One-liner:** SchedulePicker popover (2h/6h/24h presets + clear) and ScheduleBadge expiry indicator integrated into FirewallCard with 14 RTL tests.

## What Was Built

### Task 1 — SchedulePicker + ScheduleBadge + Popover install (commit da410fd)

Installed shadcn `popover` component (base-ui variant). Created two client components:

- **SchedulePicker**: Clock icon button opens a Popover with 2h / 6h / 24h preset pills. Clicking a preset calls `POST /api/firewall/schedule`, then revalidates SWR. Has a "Clear schedule" button (only when `scheduleEnd` is set) that calls `DELETE /api/firewall/schedule`. Pending state (opacity-50 + disabled) matches RuleToggle pattern exactly.
- **ScheduleBadge**: Renders `role="status"` div with blue clock icon + "Expires at HH:MM" text. Falls back to "Expired — reload to refresh" for past timestamps. No live countdown.

### Task 2 — FirewallCard integration (commit 6a46fb9)

Updated `firewall-card.tsx`:
- Rule name wrapped in `flex-1 min-w-0` div to allow ScheduleBadge row beneath
- Action cluster order: Star | Badge | Clock (SchedulePicker) | Switch (RuleToggle)
- ScheduleBadge conditionally rendered when `policy.scheduleEnd !== undefined`

### Task 3 — RTL tests (commit 8e27313)

14 tests in 5 groups:
- **A** (2): Clock aria-label with/without scheduleEnd
- **B** (4): Preset clicks call correct POST body + SWR mutate
- **C** (2): Pending state — trigger disabled + wrapper opacity-50
- **D** (4): Clear schedule not rendered without scheduleEnd; renders + calls DELETE + SWR mutate
- **E** (2): Toast errors on fetch rejection and non-ok response

## Deviations from Plan

**1. [Rule 1 - Bug] Removed asChild from PopoverTrigger**
- **Found during:** Task 1 type check
- **Issue:** The installed shadcn popover uses `@base-ui/react` (not Radix). `PopoverTrigger` from base-ui has no `asChild` prop — TypeScript error TS2322.
- **Fix:** Removed `asChild` and the inner `<button>` wrapper. The Clock icon renders directly inside `PopoverTrigger`, which natively renders as a `<button>`. All trigger props (aria-label, disabled, className) moved to `PopoverTrigger`.
- **Files modified:** src/components/firewall/schedule-picker.tsx
- **Commit:** da410fd

**2. [Rule 1 - Bug] Fixed test C2 wrapper lookup**
- **Found during:** Task 3 RED phase (1 test failing)
- **Issue:** `trigger.closest('div')` found the mocked Popover's intermediate `<div>` instead of the outermost opacity wrapper.
- **Fix:** Changed to `container.firstElementChild` to directly access SchedulePicker's root div.
- **Files modified:** tests/components/firewall/schedule-picker.test.tsx
- **Commit:** 8e27313

## Known Stubs

None — SchedulePicker calls real API routes built in 11-01. ScheduleBadge derives display from `policy.scheduleEnd` which is computed server-side.

## Threat Flags

No new security surface beyond the plan's threat model. All T-11-06 through T-11-08 dispositions applied:
- T-11-06: policyId from server-rendered prop, not user input
- T-11-07: durationHours always from static PRESETS array
- T-11-08: Toast messages reveal no implementation details

## Self-Check: PASSED
