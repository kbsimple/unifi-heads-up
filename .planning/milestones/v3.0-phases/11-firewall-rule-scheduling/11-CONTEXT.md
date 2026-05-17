# Phase 11: Firewall Rule Scheduling - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning
**Mode:** Auto-generated (plans already exist — context written for executor continuity)

<domain>
## Phase Boundary

Users can set a temporary duration on an enabled firewall rule (e.g. "active for next 6 hours"), after which the rule is automatically disabled. Uses the native UniFi ONE_TIME_ONLY schedule field — no app-side timer, no database changes.

</domain>

<decisions>
## Implementation Decisions

### Schedule Mechanism
- Use native UniFi `schedule.mode = "ONE_TIME_ONLY"` with `date` + `time_range_start` + `time_range_end` fields
- No app-side cron or SQLite scheduling — UniFi enforces the window natively
- Midnight clamp: if end time crosses midnight, clamp `time_range_end` to "23:59"

### API Design
- POST `/api/firewall/schedule` — accepts `{ policyId, durationHours }`, computes end time, writes ONE_TIME_ONLY schedule
- DELETE `/api/firewall/schedule` — accepts `{ policyId }`, writes `{ mode: "ALWAYS" }` to clear schedule
- PUT `/api/firewall` extended to optionally accept a `schedule` field alongside `policyId` and `enabled`

### UI Design
- Clock icon button on each FirewallCard opens a popover with 2h / 6h / 24h preset pills
- Pending state (opacity-50, disabled) while API call is in flight
- ScheduleBadge shows blue "Expires at HH:MM" below rule name when scheduleEnd is set
- "Clear schedule" button in popover only when scheduleEnd is set

### Type Extension
- `FirewallPolicy` gains optional `scheduleEnd: number` (Unix ms) derived from the raw API schedule field
- `UnifiScheduleSchema` and `UnifiSchedule` type added to types.ts

### Claude's Discretion
All implementation details follow the plans (11-01-PLAN.md and 11-02-PLAN.md) which were created from the research findings.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/unifi/client.ts` — `updateFirewallPolicy(policyId, enabled)` — extend with optional schedule param
- `src/lib/unifi/mock.ts` — mock updateFirewallPolicy — extend to echo schedule as scheduleEnd
- `src/components/firewall/firewall-card.tsx` — existing card component, add SchedulePicker + ScheduleBadge
- shadcn/ui Popover already available in project

### Established Patterns
- Zod schemas in types.ts for API response validation
- SWR optimistic updates with revert-on-error (see Phase 9 starred rules)
- Session-guarded API routes (all /api/* routes check verifySession)
- Test files in tests/ directory (not co-located in src/)

### Integration Points
- `FirewallList` passes `policy` to `FirewallCard` — scheduleEnd flows through naturally
- `mutate('/api/firewall')` after schedule changes to refresh all card states

</code_context>

<specifics>
## Specific Ideas

- Research confirmed native UniFi ONE_TIME_ONLY schedule field works correctly (tested against live API)
- Presets: 2h / 6h / 24h only (no custom duration input)
- Schedule persists across server restarts (stored in UniFi, not app DB)

</specifics>

<deferred>
## Deferred Ideas

- Custom duration input (user types hours)
- Multi-day schedules
- Repeat schedules (weekly recurrence)

</deferred>
