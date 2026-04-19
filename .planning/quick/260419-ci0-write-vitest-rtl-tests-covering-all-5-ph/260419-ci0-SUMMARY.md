---
phase: quick-260419-ci0
plan: "01"
subsystem: testing
tags: [vitest, rtl, uat, groups, traffic-history, localStorage]
dependency_graph:
  requires: [04-01-SUMMARY, 04-02-SUMMARY, 04-03-SUMMARY]
  provides: [automated-uat-coverage-phase-04]
  affects: [04-HUMAN-UAT.md]
tech_stack:
  added: []
  patterns: [vi.stubGlobal-localStorage, vi.mock-context, recharts-ResponsiveContainer-mock, aria-expanded-selector]
key_files:
  created:
    - tests/hooks/use-groups.test.tsx
    - tests/components/groups/group-card.test.tsx
    - tests/components/groups/group-list.test.tsx
    - tests/components/dashboard/client-card-history.test.tsx
    - tests/components/dashboard/client-list-site-history.test.tsx
  modified:
    - .planning/phases/04-enhanced-features/04-HUMAN-UAT.md
decisions:
  - "Used vi.stubGlobal('localStorage', ...) with in-memory stub because Vitest 4.x jsdom does not provide a real Storage implementation (localStorage.clear is not a function)"
  - "Used document.querySelector('button[aria-expanded]') to select GroupCard expand toggle because delete button also matches /Kids Devices/ accessible name"
  - "Used getByRole('checkbox', { name: ... }) instead of getByLabelText for base-ui Checkbox because aria-labelledby creates multiple label associations"
  - "GroupList modal integration test drives full flow (open dialog, fill name, select devices, submit) rather than hook-driven fallback — base-ui Dialog portals into document.body and is fully findable by screen queries"
metrics:
  duration: "12 minutes"
  completed: "2026-04-19"
  tasks_completed: 6
  files_created: 5
  files_modified: 1
---

# Quick Task 260419-ci0: Write Vitest RTL Tests Covering All 5 Phase-04 UAT Scenarios

**One-liner:** 15 new Vitest/RTL tests automating all 5 phase-04 UAT scenarios (localStorage persistence, aggregated traffic badge, device remove, history expansion, site traffic section) using vi.stubGlobal localStorage shim for Vitest 4.x jsdom compatibility.

## Test Files Created

| File | UAT Coverage | Tests |
|------|-------------|-------|
| `tests/hooks/use-groups.test.tsx` | UAT-04-01, UAT-04-03 | 4 |
| `tests/components/groups/group-card.test.tsx` | UAT-04-02, UAT-04-03 | 4 |
| `tests/components/groups/group-list.test.tsx` | UAT-04-02 (integration) | 2 |
| `tests/components/dashboard/client-card-history.test.tsx` | UAT-04-04 | 3 |
| `tests/components/dashboard/client-list-site-history.test.tsx` | UAT-04-05 | 2 |

**Total new tests:** 15  
**Pre-existing tests:** 137  
**Final suite total:** 152 (all passing)

## Test Run Results

```
Test Files  29 passed (29)
Tests  152 passed (152)
```

Exit code: 0. No regressions.

## Commits

| Hash | Task | Description |
|------|------|-------------|
| ea398e4 | Task 1 | useGroups hook tests (UAT-04-01, UAT-04-03) |
| 7001f17 | Task 2 | GroupCard tests (UAT-04-02, UAT-04-03) |
| 8a49f8a | Task 3 | GroupList integration tests (UAT-04-02) |
| 3a47be8 | Task 4 | ClientCard history expansion tests (UAT-04-04) |
| 801b3ed | Task 5 | ClientList site traffic section tests (UAT-04-05) |

## UAT Coverage

All 5 UAT items flipped from `[pending]` to `[passed via automated: ...]` in `04-HUMAN-UAT.md`.

| UAT ID | Description | Test File |
|--------|-------------|-----------|
| UAT-04-01 | Group persistence across refresh | `tests/hooks/use-groups.test.tsx` |
| UAT-04-02 | Group creation + traffic aggregation | `tests/components/groups/group-card.test.tsx`, `group-list.test.tsx` |
| UAT-04-03 | Device remove from group | `tests/hooks/use-groups.test.tsx`, `tests/components/groups/group-card.test.tsx` |
| UAT-04-04 | Per-client traffic history expansion | `tests/components/dashboard/client-card-history.test.tsx` |
| UAT-04-05 | Site traffic section visibility | `tests/components/dashboard/client-list-site-history.test.tsx` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vitest 4.x jsdom localStorage is not a real Storage object**
- **Found during:** Task 1
- **Issue:** `localStorage.clear()` and `localStorage.setItem()` throw `TypeError: not a function`. Vitest 4.x with the `--localstorage-file` path warning indicates jsdom's localStorage is shimmed as a plain object without Storage prototype methods.
- **Fix:** Used `vi.stubGlobal('localStorage', makeLocalStorageStub())` — an in-memory Record-backed stub with full `getItem/setItem/removeItem/clear` implementation. Applied in `use-groups.test.tsx` and `group-list.test.tsx` (the two files that exercise localStorage directly).
- **Files modified:** `tests/hooks/use-groups.test.tsx`, `tests/components/groups/group-list.test.tsx`

**2. [Rule 1 - Bug] GroupCard expand toggle selector ambiguity**
- **Found during:** Task 2
- **Issue:** `screen.getByRole('button', { name: /Kids Devices/ })` matched both the expand toggle (text content) and the delete button (`aria-label="Delete Kids Devices group"`).
- **Fix:** Used `document.querySelector('button[aria-expanded]')` which uniquely targets the expand toggle.

**3. [Rule 1 - Bug] base-ui Checkbox aria-labelledby creates multiple getByLabelText matches**
- **Found during:** Task 3
- **Issue:** `screen.getByLabelText('Kid Laptop')` matched both the `<label aria-label="Kid Laptop">` wrapper and the `<span role="checkbox" aria-labelledby="...">` child.
- **Fix:** Used `screen.getByRole('checkbox', { name: 'Kid Laptop' })` which uniquely targets the checkbox by its computed accessible name.

## Known Stubs

None — all tests assert real component behaviour against mocked external dependencies (SWR, context, recharts). No placeholder data flows to UI rendering untested.

## Self-Check: PASSED

- `tests/hooks/use-groups.test.tsx` — exists, 4 tests pass
- `tests/components/groups/group-card.test.tsx` — exists, 4 tests pass
- `tests/components/groups/group-list.test.tsx` — exists, 2 tests pass
- `tests/components/dashboard/client-card-history.test.tsx` — exists, 3 tests pass
- `tests/components/dashboard/client-list-site-history.test.tsx` — exists, 2 tests pass
- Commits ea398e4, 7001f17, 8a49f8a, 3a47be8, 801b3ed all present in git log
