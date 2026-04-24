---
phase: quick
plan: 260423-las
subsystem: dashboard
tags: [bugfix, swr, date-coercion, client-card, client-table]
dependency_graph:
  requires: []
  provides: [formatLastActive-iso-string-safe]
  affects: [dashboard-client-card, dashboard-client-table]
tech_stack:
  added: []
  patterns: [instanceof-guard-before-getTime]
key_files:
  created:
    - tests/components/dashboard/format-last-active.test.tsx
  modified:
    - src/components/dashboard/client-card.tsx
    - src/components/dashboard/client-table.tsx
decisions:
  - "Keep NetworkClient.lastSeen type as Date | null; only widen the local formatLastActive parameter to accept strings at the component boundary"
  - "Use instanceof Date guard (not typeof) for coercion — handles both Date objects and ISO strings correctly"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-23"
  tasks_completed: 1
  files_modified: 3
---

# Quick Task 260423-las: Fix Dashboard lastSeen Date Crash — Summary

**One-liner:** Widened `formatLastActive` from `Date | null` to `Date | string | null` with `instanceof Date` coercion in both `client-card.tsx` and `client-table.tsx` to fix `TypeError: date.getTime is not a function` after SWR revalidation.

## What Was Done

SWR rehydration deserializes `Date` fields in cached responses to ISO 8601 strings. Both `formatLastActive` functions called `date.getTime()` directly without guarding against this, causing a `TypeError` crash on every post-revalidation render of the dashboard.

Fixed by updating the function signature and adding a single coercion line before `getTime()`:

```typescript
const d = date instanceof Date ? date : new Date(date)
const then = d.getTime()
```

This change is contained entirely within the local `formatLastActive` function in each file. No component props, `NetworkClient` type, or other code was changed.

## Commits

| Hash | Message |
|------|---------|
| 100678c | test(260423-las): add failing tests for ISO string lastSeen coercion |
| 920efe9 | fix(260423-las): coerce ISO string lastSeen in formatLastActive |

## Verification

- TypeScript: pre-existing errors in unrelated files (firewall tests) only — no new errors introduced
- `npx vitest run tests/components/dashboard/format-last-active.test.tsx` — 5/5 pass
- `npx vitest run tests/components/dashboard/` — 36/36 pass (no regressions)

## Deviations from Plan

None — plan executed exactly as written. TDD flow followed: RED (4 failing) → GREEN (5 passing).

## Known Stubs

None.

## Threat Flags

None. The `formatLastActive` function is display-only; it receives `client.lastSeen` from the internal API response, not user input. Invalid ISO strings produce `NaN`-based diffs rendering as "NaNm ago" — acceptable for internal household tooling as documented in the plan's threat register (T-las-01, disposition: accept).

## Self-Check: PASSED

- `src/components/dashboard/client-card.tsx` — modified, contains `new Date(date)` coercion
- `src/components/dashboard/client-table.tsx` — modified, contains `new Date(date)` coercion
- `tests/components/dashboard/format-last-active.test.tsx` — created
- Commits 100678c and 920efe9 exist in git log
