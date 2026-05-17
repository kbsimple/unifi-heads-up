# Phase 10: Insights Page - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a dedicated Insights page accessible from main navigation. The page provides two views using SQLite snapshot data from Phase 8:
1. Heaviest-traffic devices ranked by total bandwidth over a selectable 7/14/30-day period
2. Per-device hourly activity patterns — which hours of the day a device is typically active — over the same selectable period

</domain>

<decisions>
## Implementation Decisions

### Page Layout & Navigation
- New `/insights` route in Next.js App Router
- Add "Insights" link to main navigation alongside existing Dashboard / Firewall links
- Time range selector (7d / 14d / 30d) as tab group or segmented control at top of page — applies to both views
- Page divided into two sections: "Top Devices" above, "Device Activity" below

### Heaviest Users View
- Ranked list/table of devices ordered by total bandwidth (download + upload) descending
- Show device display name (MAC-resolved), total bandwidth in human-readable units (MB/GB), and a relative bar for visual proportion
- Use Recharts `BarChart` (already in codebase) — horizontal bar chart with device names on Y axis
- Clicking a device in this list scrolls to / selects that device in the hourly activity view

### Per-Device Hourly Activity
- 24-column grid (hours 0–23) showing average bandwidth or "active" indication per hour
- Use a heat-map style display: color intensity based on average bandwidth in that hour slot
- Device selector: clicking from heaviest users list pre-selects; also a dropdown to pick any device
- "Active" threshold: any hour where average bandwidth ≥ 0.5 Mbps (idle threshold)

### Data API
- New `GET /api/insights/top-devices?days=7|14|30` — returns ranked devices with total bytes
- New `GET /api/insights/device-activity?mac=XX:XX:XX:XX:XX:XX&days=7|14|30` — returns hourly buckets
- Both query SQLite snapshots table from Phase 8
- Both require session auth (same pattern as other API routes)

### Claude's Discretion
- Exact color palette for heatmap — use existing dark theme colors (zinc scale)
- Loading/skeleton states — consistent with existing dashboard patterns
- Recharts component configuration details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/dashboard/traffic-chart.tsx` — Recharts usage pattern to follow
- `src/components/dashboard/traffic-badge.tsx` — status badge styling reference
- `src/lib/unifi/format.ts` — device display name resolution (MAC → name)
- `src/lib/db/` (Phase 8) — SQLite query helpers
- shadcn `Card`, `Button`, `Select` components available

### Established Patterns
- `'use client'` for Recharts components
- SWR for client-side data fetching with `fallbackData` from Server Component
- Session auth check in every API route
- Dark theme: zinc-900 background, zinc-100 text, zinc-700 borders

### Integration Points
- New route: `src/app/insights/page.tsx` (Server Component for initial data)
- New client component: `src/components/insights/top-devices.tsx`
- New client component: `src/components/insights/device-activity.tsx`
- New API routes: `src/app/api/insights/top-devices/route.ts`, `src/app/api/insights/device-activity/route.ts`
- Navigation: update existing nav component to add Insights link

</code_context>

<specifics>
## Specific Ideas

- "Phone xyz is active often between 10pm and 11pm" — the hourly activity pattern is the key use case (confirmed by user)
- Heaviest users ranking is the other primary use case (confirmed by user)
- User-selectable time range: 7, 14, 30 days (confirmed by user)
- Dedicated page, not embedded in dashboard (confirmed by user)

</specifics>

<deferred>
## Deferred Ideas

- Push notifications for unusual activity — not in scope
- Per-device data caps or alerts — not in scope
- Export to CSV — not in scope

</deferred>
