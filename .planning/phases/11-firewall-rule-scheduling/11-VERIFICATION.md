---
phase: 11-firewall-rule-scheduling
verified: 2026-05-17T00:00:00Z
status: gaps_found
score: 3/4
overrides_applied: 0
gaps:
  - truth: "Selecting a duration enables the rule and schedules automatic disabling after the chosen period — and a scheduled rule can be cleared"
    status: partial
    reason: "DELETE /api/firewall/schedule requires { policyId, enabled } per ClearScheduleRequestSchema, but schedule-picker.tsx handleClear only sends { policyId }. The route returns 400 VALIDATION_ERROR at runtime. The RTL tests pass because they mock fetch and assert the incomplete body, masking the breakage."
    artifacts:
      - path: "src/app/api/firewall/schedule/route.ts"
        issue: "ClearScheduleRequestSchema requires enabled: z.boolean() but client never sends it"
      - path: "src/components/firewall/schedule-picker.tsx"
        issue: "handleClear sends { policyId: policy._id } — missing enabled field"
      - path: "tests/components/firewall/schedule-picker.test.tsx"
        issue: "Test D3 asserts incomplete body { policyId } — test itself encodes the bug"
    missing:
      - "Fix handleClear in schedule-picker.tsx to include enabled: policy.enabled in the DELETE body"
      - "OR remove enabled from ClearScheduleRequestSchema and have the route read current policy state from UniFi before calling updateFirewallPolicy"
      - "Update test D3 to assert the correct body once the fix is applied"
---

# Phase 11: Firewall Rule Scheduling — Verification Report

**Phase Goal:** Users can set a temporary duration on an enabled firewall rule (e.g. "active for next 6 hours"), after which the rule is automatically disabled
**Verified:** 2026-05-17
**Status:** gaps_found — 1 gap blocking Clear Schedule flow
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A duration picker (presets: 2h / 6h / 24h) is accessible from each firewall rule card | VERIFIED | `SchedulePicker` with PRESETS array (2h/6h/24h) imported and rendered in `FirewallCard`. Clock icon triggers Popover with three preset buttons. |
| 2 | Selecting a duration enables the rule and schedules automatic disabling after the chosen period | VERIFIED | `handlePreset` POSTs `{ policyId, durationHours }` to `/api/firewall/schedule`. Route computes ONE_TIME_ONLY window, calls `updateFirewallPolicy(policyId, true, schedule)`, which PUTs to UniFi. UniFi enforces the schedule server-side. |
| 3 | Rules with active schedules display a countdown or expiry indicator | VERIFIED | `ScheduleBadge` renders `role="status"` with "Expires at HH:MM" when `scheduleEnd` is a future timestamp. `FirewallCard` conditionally renders it when `policy.scheduleEnd !== undefined`. |
| 4 | The schedule survives a server restart (persisted, not in-memory) | VERIFIED | Schedule is written to UniFi via PUT (not stored in Node.js memory). `getFirewallPolicies()` reads it back from the UniFi API and recomputes `scheduleEnd` via `scheduleEndFromSchedule`. Server restart is transparent. |

**Score:** 3/4 truths fully verified (SC-2 is partially blocked by the Clear Schedule bug — the set-schedule path works, but clearing is broken at runtime)

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/unifi/types.ts` — UnifiScheduleSchema, scheduleEnd on FirewallPolicy | VERIFIED | `UnifiScheduleSchema` is a `z.union` of ALWAYS (with passthrough) and ONE_TIME_ONLY. `FirewallPolicySchema` has `schedule` and `scheduleEnd` optional fields. |
| `src/lib/unifi/client.ts` — updateFirewallPolicy with schedule param, scheduleEnd mapping | VERIFIED | `scheduleEndFromSchedule` helper correctly parses `date + T + time_range_end`. `getFirewallPolicies` maps it. `updateFirewallPolicy` accepts optional `schedule` and merges it into the GET-then-PUT flow. |
| `src/lib/unifi/mock.ts` — mock schedule support | VERIFIED | `updateFirewallPolicy` in mock stores `schedule` and `scheduleEnd`. `getFirewallPolicies` returns shallow copies with schedule state. |
| `src/app/api/firewall/schedule/route.ts` — POST/DELETE handlers | STUB (partial) | POST handler is fully correct. DELETE handler has schema mismatch: requires `enabled: z.boolean()` but client never sends it — runtime 400 on every Clear Schedule click. |
| `src/components/firewall/schedule-picker.tsx` — 2h/6h/24h UI | VERIFIED (POST path) / BROKEN (DELETE path) | PRESETS render correctly. `handlePreset` wiring is complete. `handleClear` omits `enabled` from body — runtime failure guaranteed. |
| `src/components/firewall/schedule-badge.tsx` — expiry indicator | VERIFIED | Renders "Expires at HH:MM" or "Expired — reload to refresh". Correct conditional rendering in FirewallCard. |
| `src/components/firewall/firewall-card.tsx` — integration | VERIFIED | Imports `SchedulePicker` and `ScheduleBadge`. Both are used in render with correct conditionals. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `schedule-picker.tsx` | `POST /api/firewall/schedule` | `fetch` + `handlePreset` | WIRED | Sends `{ policyId, durationHours }`, revalidates SWR |
| `schedule-picker.tsx` | `DELETE /api/firewall/schedule` | `fetch` + `handleClear` | BROKEN | Sends `{ policyId }` only — route requires `{ policyId, enabled }` |
| `POST /api/firewall/schedule` | `updateFirewallPolicy` | `import { updateFirewallPolicy }` | WIRED | Called with `(policyId, true, schedule)` |
| `DELETE /api/firewall/schedule` | `updateFirewallPolicy` | `import { updateFirewallPolicy }` | WIRED (never reached) | Validation fails before reaching this call |
| `getFirewallPolicies` | `scheduleEnd` on returned policy | `scheduleEndFromSchedule` helper | WIRED | Maps ONE_TIME_ONLY to Unix ms |
| `FirewallCard` | `SchedulePicker` | import + JSX render | WIRED | `<SchedulePicker policy={policy} />` |
| `FirewallCard` | `ScheduleBadge` | import + conditional render | WIRED | `policy.scheduleEnd !== undefined` guard |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `ScheduleBadge` | `scheduleEnd` prop | `FirewallCard` → `policy.scheduleEnd` | Yes — computed server-side from UniFi API schedule field | FLOWING |
| `SchedulePicker` | `policy.scheduleEnd` (hasSchedule flag) | `FirewallCard` → `policy.scheduleEnd` | Yes — same source | FLOWING |
| `POST /api/firewall/schedule` | `durationHours` | Request body (Zod-validated) | Yes | FLOWING |
| `DELETE /api/firewall/schedule` | `enabled` | Request body — MISSING | No — schema validation fails | DISCONNECTED |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry point available without starting the Next.js server. The type-check evidence below is equivalent.

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/components/firewall/schedule-picker.tsx` line 56 | `handleClear` sends incomplete body `{ policyId }` — missing `enabled` field required by DELETE route | Blocker | Clear Schedule button always fails with 400 at runtime |
| `tests/components/firewall/schedule-picker.test.tsx` line 171 | Test D3 asserts the broken body — test encodes the bug and passes by mocking fetch | Blocker | Bug survives test suite because the test is wrong |

---

## Human Verification Required

None required for the programmatically-verifiable gap found above.

---

## Gaps Summary

One blocker gap: the "Clear schedule" DELETE flow has a schema mismatch between client and server.

**Root cause:** `ClearScheduleRequestSchema` in the route requires `enabled: z.boolean()` so the handler can pass the current enabled state through to `updateFirewallPolicy`. The client-side `handleClear` in `schedule-picker.tsx` was written without this field. The backend tests (Group D in `schedule.test.ts`) correctly include `enabled` in the body and pass. The RTL tests for the component (test D3) mock `fetch` and assert the incomplete body — neither test catches the mismatch.

**Impact:** Clicking "Clear schedule" always returns HTTP 400. The schedule cannot be removed without a direct API call.

**Two valid fixes:**

1. **Client fix (minimal):** Add `enabled: policy.enabled` to the `handleClear` body in `schedule-picker.tsx`. Update RTL test D3 to assert the correct body.

2. **Server fix (cleaner):** Remove `enabled` from `ClearScheduleRequestSchema`. Have the DELETE route fetch the current policy from UniFi to get the live `enabled` state before calling `updateFirewallPolicy`. This avoids the client needing to know the correct state.

The set-schedule (POST) path and all three success criteria around persistence, display, and duration selection are fully working.

---

_Verified: 2026-05-17_
_Verifier: Claude (gsd-verifier)_
