---
phase: 04-enhanced-features
plan: 02
subsystem: groups-ui
tags: [groups, ui, crud, traffic-aggregation, shadcn, zod-validation]
dependency_graph:
  requires: [useGroups, useLocalStorage, DeviceGroup, shadcn-dialog, shadcn-checkbox]
  provides: [DeviceChip, GroupCard, CreateGroupModal, AddDevicesModal, GroupList, groups-route]
  affects: [src/app/(dashboard)/groups/page.tsx]
tech_stack:
  added: []
  patterns: [aggregated-traffic-status, controlled-dialog, swr-with-fallback, zod-input-validation]
key_files:
  created:
    - src/components/groups/device-chip.tsx
    - src/components/groups/group-card.tsx
    - src/components/groups/create-group-modal.tsx
    - src/components/groups/add-devices-modal.tsx
    - src/components/groups/group-list.tsx
    - src/app/(dashboard)/groups/page.tsx
  modified:
    - src/hooks/use-groups.ts
decisions:
  - createGroup returns new group id so GroupList can immediately call addGroupDevice with selected devices
  - AddDevicesModal created as separate component (not in plan) to handle "Add devices" button on GroupCard
  - Zod validation applied to group name per T-04-03 threat model (max 50 chars, alphanumeric/spaces/hyphens)
  - computeAggregatedStatus uses byte/s thresholds: High>1MB/s, Medium>100KB/s, Low>0, Idle=0
metrics:
  duration: ~10min
  completed: "2026-04-18T19:50:00Z"
  tasks_completed: 4
  files_changed: 7
---

# Phase 04 Plan 02: Groups UI Summary

**One-liner:** Complete Groups page with DeviceChip pills, expandable GroupCard with traffic aggregation, CreateGroupModal with Zod name validation, and SWR-backed GroupList.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create DeviceChip component | b1fbfa3 | device-chip.tsx |
| 2 | Create GroupCard component | e865ec6 | group-card.tsx |
| 3 | Create CreateGroupModal component | 0908393 | create-group-modal.tsx |
| 4 | Create GroupList and Groups page | f05fb65 | group-list.tsx, groups/page.tsx, add-devices-modal.tsx, use-groups.ts |

## What Was Built

- **`src/components/groups/device-chip.tsx`** — Pill component showing device name, TrafficBadge, and an X remove button with accessible aria-label. Styled `rounded-full bg-zinc-800 px-3 py-1`.

- **`src/components/groups/group-card.tsx`** — Expandable card per D-03/D-06. Header shows group name, device count, aggregated TrafficBadge, and Trash2 delete button. Expanding reveals DeviceChip per device plus an "Add devices" button. `computeAggregatedStatus` sums all device download+upload rates, applies byte-per-second thresholds.

- **`src/components/groups/create-group-modal.tsx`** — Base UI Dialog with controlled `open` state. Group name Input validated by Zod schema (min 1, max 50, `^[a-zA-Z0-9 -]+$`). Device selection via Checkbox list with scrollable container. Resets form state on cancel/create.

- **`src/components/groups/add-devices-modal.tsx`** — Companion dialog for adding devices to an existing group. Filters out already-added devices. Enabled "Add Selected" button only when devices are selected.

- **`src/components/groups/group-list.tsx`** — Client component using SWR with 60s polling on `/api/clients` and `fallbackData`. Wires `useGroups` CRUD. Empty state with FolderPlus icon and descriptive message. Renders GroupCard list or empty state.

- **`src/app/(dashboard)/groups/page.tsx`** — Server component calling `verifySession()` and `getUnifiClients()` for SSR, then renders `<GroupList initialDevices={initialClients} />`.

## Verification

- 137 tests passed (24 test files) — no regressions
- TypeScript errors: only 2 pre-existing errors in test files (unrelated to this plan)
- All acceptance criteria verified via grep

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] `createGroup` now returns new group id**
- **Found during:** Task 4
- **Issue:** `useGroups.createGroup` returned `void`, making it impossible to immediately call `addGroupDevice` with the newly created group's id in `handleGroupCreated`.
- **Fix:** Changed return type to `string`, returns `newGroup.id` before state update.
- **Files modified:** `src/hooks/use-groups.ts`
- **Commit:** f05fb65

**2. [Rule 2 - Missing Functionality] Created `AddDevicesModal` component**
- **Found during:** Task 4
- **Issue:** GroupCard's `onAddDevices` prop had no target component to open. Plan listed the prop but not its handler's target UI.
- **Fix:** Created `add-devices-modal.tsx` with same Dialog pattern as CreateGroupModal, filtering out already-added devices.
- **Files modified:** `src/components/groups/add-devices-modal.tsx` (new)
- **Commit:** f05fb65

**3. [Rule 2 - Security] Zod validation on group name input per threat model T-04-03**
- **Found during:** Task 3
- **Issue:** Threat model required `mitigate` disposition for group name input but plan action didn't explicitly list Zod schema.
- **Fix:** Added `groupNameSchema` in `create-group-modal.tsx` with min 1, max 50, alphanumeric/spaces/hyphens pattern.
- **Files modified:** `src/components/groups/create-group-modal.tsx`
- **Commit:** 0908393

## Known Stubs

None — all group CRUD flows are fully wired. Data flows from SWR → devices, from useGroups → groups, with complete create/add/remove/delete operations.

## Threat Flags

None — no new network endpoints or auth paths introduced. Group data stays in localStorage (client-side only).

## Self-Check: PASSED

Files exist:
- src/components/groups/device-chip.tsx: FOUND
- src/components/groups/group-card.tsx: FOUND
- src/components/groups/create-group-modal.tsx: FOUND
- src/components/groups/add-devices-modal.tsx: FOUND
- src/components/groups/group-list.tsx: FOUND
- src/app/(dashboard)/groups/page.tsx: FOUND
- src/hooks/use-groups.ts: modified (createGroup returns string)

Commits exist:
- b1fbfa3: FOUND
- e865ec6: FOUND
- 0908393: FOUND
- f05fb65: FOUND
