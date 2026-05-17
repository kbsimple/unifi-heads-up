---
phase: 11-firewall-rule-scheduling
reviewed: 2026-05-17T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/lib/unifi/types.ts
  - src/lib/unifi/client.ts
  - src/lib/unifi/mock.ts
  - src/app/api/firewall/route.ts
  - src/app/api/firewall/schedule/route.ts
  - src/components/firewall/schedule-picker.tsx
  - src/components/firewall/schedule-badge.tsx
  - src/components/firewall/firewall-card.tsx
  - tests/lib/unifi/schedule.test.ts
  - tests/components/firewall/schedule-picker.test.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-17
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 11 adds firewall rule scheduling via UniFi's native `ONE_TIME_ONLY` schedule field. The overall design is sound: schedule data is stored in UniFi itself (no DB), the API route validates inputs with Zod, and the UI uses a popover with preset durations. No critical security vulnerabilities were found.

Four warnings were identified. The most impactful are a silent data-loss bug when a schedule window crosses midnight (the end time is silently clamped to 23:59 rather than spanning to the next day, with no user-visible indication), and a timezone correctness bug where `scheduleEndFromSchedule` parses a date+time string without a timezone suffix, producing a time in the server's local timezone that may not match the client's wall clock. Two additional warnings cover a TOCTOU race in the DELETE handler and the `updateFirewallPolicy` return value being parsed with a strict schema that will reject any unknown fields returned by the live API.

Three info items cover minor code quality issues.

---

## Warnings

### WR-01: Schedule silently truncated when window crosses midnight

**File:** `src/app/api/firewall/schedule/route.ts:65-67`

**Issue:** When `now + durationHours` falls on the next calendar day (e.g., set at 22:00 for 6 h → ends at 04:00 tomorrow), the code detects the date change (`end.getDate() !== now.getDate()`) and hard-clamps the end time to `23:59`. The rule stays enabled only until midnight, not for the full requested duration. No error is returned and no warning reaches the caller or UI, so the user believes the schedule is set correctly.

The clamping comment says "Clamp to 23:59 if end crosses midnight" but this is presented as a limitation, not a recoverable error. A silent 6-hour request becoming a 2-hour effective window is a confusing user experience and a correctness bug.

**Fix:** Either return a `400` with a clear message when the window would cross midnight (simpler, preserves user intent):
```typescript
if (end.getDate() !== now.getDate()) {
  return NextResponse.json(
    { error: 'VALIDATION_ERROR', message: 'Schedule window cannot cross midnight. Choose a shorter duration.' },
    { status: 400 }
  )
}
```
Or compute an adjusted end time using `date` from `end` rather than `now` (requires verifying whether UniFi accepts a `date` that differs from the start date — check API docs).

---

### WR-02: `scheduleEndFromSchedule` uses local timezone, not UTC

**File:** `src/lib/unifi/client.ts:224`

**Issue:** `new Date(`${schedule.date}T${schedule.time_range_end}`)` parses without a timezone suffix. Per the ECMAScript spec, a date-time string without a `Z` or `+offset` suffix is treated as **local time** on the server. If the Next.js server runs in UTC (Vercel default) but the user's browser is in e.g. US/Eastern, the displayed `scheduleEnd` countdown in `ScheduleBadge` will be off by the UTC offset.

The same issue exists in `src/lib/unifi/mock.ts:118` and in the test assertions in `tests/lib/unifi/schedule.test.ts:73,112` (which pass today only because both sides use `new Date(...)` in the same local timezone during the test run).

**Fix:** Append `Z` to force UTC if UniFi stores times in UTC, or determine and append the local timezone offset if UniFi stores local times. Document the assumption clearly:
```typescript
// UniFi stores schedule times in UTC — append Z to prevent local-time mis-parse
const dt = new Date(`${schedule.date}T${schedule.time_range_end}Z`)
```
If UniFi stores local times, use a consistent offset:
```typescript
const dt = new Date(`${schedule.date}T${schedule.time_range_end}:00${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
```
The same fix must be applied in `mock.ts:118`.

---

### WR-03: TOCTOU race in DELETE handler — `enabled` state may be stale

**File:** `src/app/api/firewall/schedule/route.ts:130-141`

**Issue:** The DELETE handler fetches all policies to find the current `enabled` state, then calls `updateFirewallPolicy` in a separate network round-trip. Between the GET and the PUT, another client (e.g., a concurrent toggle from the same dashboard tab or a different family member) could change `enabled`. The DELETE would then write back the stale `enabled` value, effectively silently reverting a toggle.

```typescript
// Race window: policy.enabled could change between these two calls
const policies = await getFirewallPolicies()          // GET
const policy = policies.find(p => p._id === policyId) // stale read
...
await updateFirewallPolicy(policyId, policy.enabled, { mode: 'ALWAYS' })  // PUT
```

**Fix:** Require the caller to pass the desired `enabled` state in the DELETE body rather than re-reading it from the API. The client already knows what state the rule is in:
```typescript
const ClearScheduleRequestSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  enabled: z.boolean(),  // client passes current enabled state
})
...
// No getFirewallPolicies() call needed
await updateFirewallPolicy(policyId, result.data.enabled, { mode: 'ALWAYS' })
```
This eliminates the extra GET round-trip, removes the NOT_FOUND branch (the PUT will fail with a clear error if the policy doesn't exist), and closes the race window.

---

### WR-04: `FirewallPolicySchema.parse(data)` on PUT response will reject unknown fields

**File:** `src/lib/unifi/client.ts:348`

**Issue:** After the PUT to update a firewall policy, the response body is parsed with `FirewallPolicySchema.parse(data)`. `FirewallPolicySchema` is a strict Zod object (no `.passthrough()`), so any field returned by the live UniFi API that is not explicitly declared in the schema (e.g., `action`, `ruleset`, `src_address`, etc.) will cause a `ZodError` and the entire toggle/schedule operation will throw, even though the PUT itself succeeded. The updated policy will not be returned to the client.

Note that `getFirewallPolicies()` avoids this by using `FirewallPolicyResponseSchema` which is constructed around the same base schema — it has the same issue but may be less likely to surface because list responses tend to be more permissive.

**Fix:** Add `.passthrough()` to `FirewallPolicySchema` to preserve unknown fields, or use a separate minimal schema for parsing the PUT response:
```typescript
// In types.ts — allow unknown fields from the live API
export const FirewallPolicySchema = z.object({
  _id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  schedule: UnifiScheduleSchema.optional(),
  scheduleEnd: z.number().optional(),
}).passthrough()
```
If you prefer not to change the shared schema, define an inline `.pick()` schema at the parse site:
```typescript
const parsed = FirewallPolicySchema.pick({ _id: true, name: true, enabled: true, schedule: true })
  .passthrough()
  .parse(data)
```

---

## Info

### IN-01: Test C1b has a misleading comment — "policyId=true"

**File:** `tests/lib/unifi/schedule.test.ts:202`

**Issue:** The test name is `"C1b: updateFirewallPolicy called with policyId=true and ONE_TIME_ONLY schedule"`. The `policyId=true` is clearly a copy-paste error in the description string — the actual assertion checks `policyId: 'policy-1'`. The test itself is correct; only the label is wrong.

**Fix:**
```typescript
it('C1b: updateFirewallPolicy called with policyId="policy-1" and ONE_TIME_ONLY schedule', async () => {
```

---

### IN-02: `aria-pressed={false}` is hardcoded on preset buttons

**File:** `src/components/firewall/schedule-picker.tsx:90`

**Issue:** `aria-pressed={false}` is set on each preset button (`2h`, `6h`, `24h`). This is semantically incorrect — `aria-pressed` is for toggle buttons that have on/off state. These are action buttons (they trigger an operation, not a toggle). A screen reader will announce "button, not pressed" for each, which is confusing. The attribute should be omitted entirely.

**Fix:** Remove `aria-pressed={false}` from the preset `Button` elements.

---

### IN-03: `ScheduleBadge` renders identically for all expired schedules with no time indication

**File:** `src/components/firewall/schedule-badge.tsx:14-16`

**Issue:** When `scheduleEnd <= now` (i.e., the schedule has expired), the badge shows the static string `"Expired — reload to refresh"`. There is no indication of when it expired. More importantly, the `FirewallCard` renders the badge unconditionally whenever `policy.scheduleEnd !== undefined` — so an expired schedule from yesterday will still show this badge until the user reloads. While this is a UX issue rather than a bug, it could cause confusion: the rule may be enabled or disabled for reasons the user cannot easily understand from the stale badge.

**Fix (minimal):** Consider hiding the badge entirely when `isExpired` is true and no `scheduleEnd` refresh has occurred, or note in comments that the component is intentionally left visible to prompt the user to reload. As-is, the behavior is at least deterministic, but would benefit from a code comment explaining the intentional design:
```typescript
// Intentionally kept visible when expired to prompt the user to refresh.
// The parent (firewall-card.tsx) does not filter by expiry state.
if (isExpired) {
  displayText = 'Expired — reload to refresh'
}
```

---

_Reviewed: 2026-05-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
