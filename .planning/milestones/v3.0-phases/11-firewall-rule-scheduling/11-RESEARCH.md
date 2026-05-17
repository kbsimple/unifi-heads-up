---
phase: 11
status: complete
date: 2026-05-17
---

# Phase 11 Research: Firewall Rule Scheduling

## Key Finding: UniFi Schedule Field (Live API)

Confirmed by direct API call to `https://192.168.0.1/proxy/network/v2/api/site/default/firewall-policies`.

### Schedule field shapes (observed)

**Always active (default):**
```json
{ "mode": "ALWAYS" }
```
or
```json
{ "mode": "ALWAYS", "repeat_on_days": [], "time_all_day": false }
```

**Time-bounded (one-time):**
```json
{
  "mode": "ONE_TIME_ONLY",
  "date": "YYYY-MM-DD",
  "time_range_start": "HH:MM",
  "time_range_end": "HH:MM"
}
```

### Example: "Block YouTube Dominic" rule

```json
"schedule": {
  "date": "2026-05-12",
  "mode": "ONE_TIME_ONLY",
  "time_range_end": "23:59",
  "time_range_start": "20:00"
}
```

The rule is `enabled: true`, `action: "BLOCK"`. The schedule controls the window during which the rule is active.

## How the Feature Works

**To schedule a rule for N hours from now:**
1. Compute `now` → `endTime = now + N hours`
2. PUT `{ ...fullPolicy, schedule: { mode: "ONE_TIME_ONLY", date: "YYYY-MM-DD", time_range_start: "HH:MM", time_range_end: "HH:MM" } }`
3. If end time crosses midnight, clamp `time_range_end` to `"23:59"` (simplest safe option; edge case)

**To clear the schedule:**
1. PUT `{ ...fullPolicy, schedule: { mode: "ALWAYS" } }`

**No new API endpoints required** — the existing `PUT /proxy/network/v2/api/site/default/firewall-policies/{id}` accepts the schedule field as part of the full policy body. `updateFirewallPolicy` already does GET-then-PUT, so adding `schedule` to the merge is trivial.

## Required Code Changes

### 1. `src/lib/unifi/types.ts` — Extend FirewallPolicy

Add `UnifiSchedule` type and `schedule` field:

```ts
const UnifiScheduleSchema = z.union([
  z.object({ mode: z.literal('ALWAYS') }).passthrough(),
  z.object({
    mode: z.literal('ONE_TIME_ONLY'),
    date: z.string(),
    time_range_start: z.string(),
    time_range_end: z.string(),
  }),
])

// Add to FirewallPolicySchema:
schedule: UnifiScheduleSchema.optional()
```

Use `.passthrough()` on the outer schema to avoid stripping unknown fields (already a known issue from Phase debugging).

### 2. `src/lib/unifi/client.ts` — Update `updateFirewallPolicy`

Add optional `schedule` parameter:

```ts
export async function updateFirewallPolicy(
  policyId: string,
  enabled: boolean,
  schedule?: UnifiSchedule
): Promise<FirewallPolicy>
```

Merge into the PUT body alongside `enabled`.

### 3. `src/app/api/firewall/route.ts` — Accept schedule in PUT body

Extend `ToggleRequestSchema`:
```ts
const ToggleRequestSchema = z.object({
  policyId: z.string().min(1),
  enabled: z.boolean(),
  schedule: UnifiScheduleSchema.optional(),
})
```

Pass `schedule` through to `updateFirewallPolicy`.

### 4. `src/components/firewall/` — New UI components

- **`schedule-popover.tsx`** — Clock icon button + Popover with 2h/6h/24h preset pills + "Clear schedule" link
- **`firewall-card.tsx`** — Add SchedulePopover to action cluster; show expiry badge when `schedule.mode === 'ONE_TIME_ONLY'`

### 5. `src/lib/unifi/mock.ts` — Update mock

`updateFirewallPolicy` mock must accept and echo back `schedule` field.

## Plan Breakdown (2 waves)

**Wave 1 — Backend (no UI dependency):**
- Plan 11-01: Extend types + client + API route to support schedule field

**Wave 2 — Frontend (depends on Wave 1):**
- Plan 11-02: SchedulePopover component + FirewallCard integration + expiry indicator

## `.env.local` Correction (applied)

- `UNIFI_HOST` was `192.168.1.1` → corrected to `192.168.0.1`
- `UNIFI_API_KEY` had duplicate prefix → corrected to `K-uZuE9rhiuitnoow8cQsadEmgA-MqkO`
