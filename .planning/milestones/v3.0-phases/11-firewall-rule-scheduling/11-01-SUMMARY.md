---
phase: 11-firewall-rule-scheduling
plan: "01"
subsystem: backend
tags: [firewall, scheduling, types, api, tests]
dependency_graph:
  requires: []
  provides:
    - UnifiScheduleSchema (types.ts)
    - UnifiSchedule type (types.ts)
    - scheduleEnd on FirewallPolicy (types.ts)
    - updateFirewallPolicy with schedule param (client.ts, mock.ts)
    - getFirewallPolicies scheduleEnd mapping (client.ts)
    - PUT /api/firewall accepts schedule (route.ts)
    - POST /api/firewall/schedule (schedule/route.ts)
    - DELETE /api/firewall/schedule (schedule/route.ts)
  affects:
    - 11-02 (frontend schedule UI — depends on scheduleEnd on FirewallPolicy)
tech_stack:
  added: []
  patterns:
    - Zod union schema with passthrough() for ALWAYS variant
    - GET-then-PUT schedule merge in updateFirewallPolicy
    - scheduleEndFromSchedule helper (ONE_TIME_ONLY date+time_range_end → Unix ms)
    - Midnight clamp for schedule end times crossing day boundary
key_files:
  created:
    - src/app/api/firewall/schedule/route.ts
    - tests/lib/unifi/schedule.test.ts
  modified:
    - src/lib/unifi/types.ts
    - src/lib/unifi/client.ts
    - src/lib/unifi/mock.ts
    - src/app/api/firewall/route.ts
decisions:
  - "UnifiScheduleSchema uses z.union ALWAYS|ONE_TIME_ONLY with passthrough() on ALWAYS to preserve unknown fields (e.g. repeat_on_days)"
  - "scheduleEnd computed from schedule.date + schedule.time_range_end using new Date(date+T+time) — local time parsing matches user intent"
  - "POST /api/firewall/schedule always sets enabled=true alongside schedule (UX: scheduling implies enabling)"
  - "DELETE /api/firewall/schedule GETs current policies to preserve existing enabled state before writing ALWAYS"
  - "Midnight clamp: if end crosses day boundary, time_range_end clamped to 23:59 (matches UniFi research findings)"
metrics:
  duration: "4 minutes"
  completed_date: "2026-05-17"
  tasks_completed: 3
  files_changed: 6
---

# Phase 11 Plan 01: Firewall Rule Scheduling Backend Summary

**One-liner:** Backend schedule support — UnifiScheduleSchema + ONE_TIME_ONLY schedule threading from types through client/mock/routes with Vitest coverage.

## What Was Built

Extended the UniFi types, client, mock, and API layer to support native UniFi firewall rule scheduling. The backend can now accept a duration and write a ONE_TIME_ONLY schedule to the UniFi console in a single PUT — no app-side timer, no database changes.

### Task 1 — types.ts (commit 7d71c43)

Added `UnifiScheduleSchema` (Zod union of ALWAYS and ONE_TIME_ONLY shapes) and extended `FirewallPolicySchema` with two optional fields:
- `schedule: UnifiScheduleSchema.optional()` — raw schedule field from UniFi API
- `scheduleEnd: z.number().optional()` — computed Unix ms, set by `getFirewallPolicies()`

### Task 2 — client.ts, mock.ts, route.ts, schedule/route.ts (commit d4fa103)

- `updateFirewallPolicy` in both `client.ts` and `mock.ts` gains optional `schedule?: UnifiSchedule` param merged into the GET-then-PUT flow
- `scheduleEndFromSchedule` helper maps ONE_TIME_ONLY `date + time_range_end` to Unix ms
- `getFirewallPolicies` in `client.ts` maps schedule to `scheduleEnd` before returning
- `PUT /api/firewall` ToggleRequestSchema extended with `schedule: UnifiScheduleSchema.optional()`
- New `src/app/api/firewall/schedule/route.ts` with:
  - `POST`: computes schedule window from `durationHours`, calls `updateFirewallPolicy(policyId, true, schedule)`
  - `DELETE`: GETs current policy to preserve `enabled` state, calls `updateFirewallPolicy(policyId, policy.enabled, { mode: 'ALWAYS' })`

### Task 3 — Vitest tests (commit 6b3543a)

14 tests across 4 groups covering:
- Group A: `scheduleEnd` derivation from ALWAYS vs ONE_TIME_ONLY via mock module
- Group B: mock `updateFirewallPolicy` schedule param stores, clears, and preserves `scheduleEnd`
- Group C: `POST /api/firewall/schedule` — valid request, missing policyId, durationHours=0, unauthenticated
- Group D: `DELETE /api/firewall/schedule` — valid request, missing policyId, unauthenticated

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired. Mock module correctly stores and returns schedule/scheduleEnd fields.

## Threat Flags

No new security surface beyond what was already in the plan's threat model. All T-11-01 through T-11-03 mitigations applied:
- T-11-01: Zod `z.number().int().min(1).max(24)` on durationHours
- T-11-02: Zod `z.string().min(1)` on policyId in both POST and DELETE
- T-11-03: `getSession()` check at handler entry in both POST and DELETE, before any UniFi call

## Self-Check: PASSED
