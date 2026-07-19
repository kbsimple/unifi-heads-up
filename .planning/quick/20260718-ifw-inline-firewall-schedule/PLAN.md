---
slug: ifw-inline-firewall-schedule
title: Add schedule picker to inline firewall rules in dashboard
status: in_progress
---

# Add schedule picker to inline firewall rules

## Goal
Inline firewall rule toggles in the dashboard device expanded row should support
the same 2h/6h/24h schedule picker that exists on the dedicated firewall page.
Rules with expired schedules should show an expiry badge rather than appearing active.

## Changes

### 1. `src/components/firewall/schedule-picker.tsx`
Add `extraMutateKeys?: string[]` prop. After `mutate('/api/firewall')`, also
mutate each extra key so device-rules SWR cache refreshes inline.

### 2. `src/app/api/firewall/device-rules/route.ts`
Include `scheduleEnd` in the response shape alongside `id`, `name`, `enabled`.

### 3. `src/components/dashboard/inline-firewall-rules.tsx`
- Add `scheduleEnd?: number` to `DeviceRule` interface
- Import `SchedulePicker` and `ScheduleBadge`
- Pass `scheduleEnd` through to the policy object for `RuleToggle` and `SchedulePicker`
- Render `SchedulePicker` next to each toggle with `extraMutateKeys={[key]}`
- Render `ScheduleBadge` below the rule name when `scheduleEnd` is set

### 4. `tests/app/api/firewall/device-rules/route.test.ts`
Update to assert `scheduleEnd` is included in the response.

## Layout (per rule)
`[Toggle] [Clock] [Name]`
          `[Expiry badge if scheduleEnd set]`
