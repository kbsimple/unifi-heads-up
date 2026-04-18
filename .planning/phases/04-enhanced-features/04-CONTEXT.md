# Phase 4: Enhanced Features - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can organize devices into groups and view traffic history. This phase delivers: device groups (create, assign devices, delete, persist), group-level traffic aggregation, and 24-hour traffic trend charts for site and individual clients. Builds on Phase 2 (device list) and Phase 3 (firewall control).

</domain>

<decisions>
## Implementation Decisions

### Groups UI Location
- **D-01:** Third tab "Groups" in top navigation — follows existing Dashboard/Firewall tab pattern
- **D-02:** Navigation becomes: Dashboard | Firewall | Groups (three tabs, same styling)
- **D-03:** Groups page shows all groups as cards, click to expand and see devices within

### Group Creation/Assignment UX
- **D-04:** Modal dialog for creating groups — triggered by "New Group" button on Groups page
- **D-05:** Checkbox multi-select for adding devices — simple UX for non-technical family users
- **D-06:** Inline device list within group card — shows which devices belong to the group
- **D-07:** Remove device via X button on device chip in group card

### Group Persistence
- **D-08:** LocalStorage for group data — groups persist across sessions without backend storage
- **D-09:** Group data structure: `{ id, name, deviceIds: string[] }` stored as JSON array

### Group Traffic Aggregation
- **D-10:** Group card shows aggregated traffic status — sum of all devices in group
- **D-11:** Per-device status visible when group expanded — same High/Medium/Low/Idle badges
- **D-12:** Empty group shows "No devices" placeholder with "Add devices" action

### Historical Trends Display
- **D-13:** Expandable panel on client card — click "View History" to show 24-hour chart
- **D-14:** Site-wide trend accessible via "Site Traffic" section above device list
- **D-15:** Line chart (area fill) for time-series — Recharts library (per CLAUDE.md recommendation)
- **D-16:** 24-hour window with hourly data points (24 points total)

### Trend Data Storage
- **D-17:** Client-side accumulation during session — samples captured every 60s (same interval as polling)
- **D-18:** Data stored in React state/context, lost on page refresh (acceptable for MVP)
- **D-19:** Future enhancement: Vercel Cron + KV storage for persistent history

### Claude's Discretion
- shadcn Dialog component for group creation modal
- Recharts AreaChart for traffic trends
- Existing Badge component for traffic status
- Existing Card component for group cards
- LocalStorage via custom hook (pattern: `useLocalStorage`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Configuration
- `CLAUDE.md` — Tech stack (Next.js, React 19, Tailwind CSS 4, TypeScript 6), Recharts for charts, Vercel deployment

### Requirements
- `.planning/REQUIREMENTS.md` — GRUP-01 through GRUP-05 (device groups), GTRA-01 through GTRA-02 (group traffic), HIST-01 through HIST-03 (historical trends)
- `.planning/PROJECT.md` — Core value (visibility and control), constraints

### Prior Phase Context
- `.planning/phases/01-foundation-authentication/01-CONTEXT.md` — Auth patterns, error handling, toast notifications
- `.planning/phases/02-dashboard-traffic-monitoring/02-CONTEXT.md` — Dashboard patterns, device cards, SWR polling
- `.planning/phases/03-firewall-control/03-CONTEXT.md` — Navigation tabs, card styling, optimistic updates

### External References
- `https://recharts.org/` — Recharts documentation for AreaChart configuration
- `https://developer.ui.com/site-manager-api/` — UniFi Site Manager API for client data

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/card.tsx` — Card component for group display
- `src/components/ui/badge.tsx` — Badge for traffic status (reused for groups)
- `src/components/ui/dialog.tsx` — Dialog component (needs installation via `npx shadcn@latest add dialog`)
- `src/components/dashboard/client-card.tsx` — Client card pattern (extend with history expandable)
- `src/lib/unifi/types.ts` — NetworkClient type (extend with group membership?)
- `src/app/(dashboard)/layout.tsx` — Navigation layout (add Groups tab)

### Established Patterns
- Tab navigation with `usePathname()` and `Link` (Phase 3)
- SWR with 60-second polling interval (Phase 2)
- Card list with dark theme styling (Phases 2, 3)
- Toast notifications for errors (Phase 1)

### Integration Points
- Add "Groups" tab to navigation in `src/app/(dashboard)/layout.tsx`
- New route: `src/app/(dashboard)/groups/page.tsx` for groups view
- New components: `GroupCard`, `GroupList`, `CreateGroupModal`, `TrafficChart`
- New hook: `useGroups()` for LocalStorage persistence
- New context: `TrafficHistoryContext` for trend data accumulation

</code_context>

<specifics>
## Specific Ideas

- Groups tab with same styling as Dashboard/Firewall (text-sky-600 active, text-zinc-400 inactive)
- Group card: name at top, device chips below, traffic status badge
- "New Group" button opens modal with group name input and device checkboxes
- Client card "View History" link expands inline area chart
- Site traffic summary above device list on Dashboard page
- 24-point line chart with Mbps on Y-axis, hours on X-axis

</specifics>

<deferred>
## Deferred Ideas

- **Persistent historical data** — Vercel Cron + KV storage for data that survives page refresh
- **Custom time ranges** — Beyond 24-hour window (would need server-side storage)
- **Group-based firewall rules** — Apply firewall toggle to entire group (new capability)

</deferred>

---
*Phase: 04-enhanced-features*
*Context gathered: 2026-04-18*