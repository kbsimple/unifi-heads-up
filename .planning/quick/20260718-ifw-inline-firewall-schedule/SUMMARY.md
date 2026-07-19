---
slug: ifw-inline-firewall-schedule
title: Add schedule picker to inline firewall rules in dashboard
status: complete
completed: 2026-07-18
commit: 2f8d6bb
---

# Summary

Added 2h / 6h / 24h schedule picker to inline firewall rule toggles in the
dashboard device expanded row, matching the interaction pattern on the dedicated
firewall page.

## What was done

- **`schedule-picker.tsx`**: Added `extraMutateKeys` prop so inline usage can
  revalidate the device-rules SWR cache after setting or clearing a schedule
- **`device-rules/route.ts`**: Added `scheduleEnd` to the response shape
- **`inline-firewall-rules.tsx`**: Added `SchedulePicker` (clock icon) and
  `ScheduleBadge` (expiry display) next to each rule toggle
- **`route.test.ts`**: Updated to assert `scheduleEnd` is present in response

## Result

Each inline rule now shows `[Toggle] [Clock] [Name]`. The clock opens a
2h/6h/24h popover. Rules with active schedules show a blue expiry badge;
expired schedules show "Expired" instead of appearing active.
