# Phase 9: Starred Firewall Rules - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Add the ability to star/unstar firewall rules. Starred preferences are stored server-side (SQLite, using the Phase 8 db module). The firewall rules list shows a star indicator on each rule and a filter to show only starred rules.

</domain>

<decisions>
## Implementation Decisions

### Star Icon & Card Placement
- Use `Star` icon from lucide-react (filled = starred, outlined = unstarred) — matches existing icon library
- Place star in top-right corner of `FirewallCard`, to the left of the enabled/disabled toggle
- Optimistic toggle: update UI immediately via SWR mutate, confirm with server in background — same pattern as rule toggle
- Empty starred filter state: show "No starred rules — click ★ on any rule to star it" message

### Filter Control UX
- "Starred only" toggle button in the `FirewallList` header, right-aligned
- When active: button has a filled/highlighted visual state (e.g. `variant="default"` vs `variant="outline"`)
- Filter applies client-side to already-fetched policies — no extra API call needed

### Storage & API Shape
- New SQLite table `starred_rules (rule_id TEXT PRIMARY KEY, starred_at INTEGER)` — uses Phase 8 db module
- New API endpoints: `GET /api/firewall/starred` returns array of starred rule IDs; `POST /api/firewall/starred` body `{ ruleId, starred: boolean }` toggles
- `FirewallList` fetches starred IDs on mount via SWR, merges with policy list client-side

### Claude's Discretion
- Exact card layout adjustments (padding, icon size) — match existing card proportions
- Error handling for star API failures — toast or silent retry, consistent with existing patterns

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/firewall/firewall-card.tsx` — card to extend with star icon
- `src/components/firewall/firewall-list.tsx` — list to extend with filter toggle and starred SWR fetch
- `src/components/ui/button.tsx` — shadcn Button for filter toggle
- `lucide-react` — `Star` icon available
- SWR pattern from `firewall-list.tsx` — reuse for starring endpoint

### Established Patterns
- SWR optimistic update: `mutate(optimisticData, { revalidate: true })` as used in rule toggle
- API route pattern: session check → Zod validation → action → NextResponse.json
- `better-sqlite3` or Phase 8 db module for SQLite access

### Integration Points
- `src/lib/db/` (Phase 8) — import db init and query helpers
- New: `src/app/api/firewall/starred/route.ts`
- Extend `FirewallCard` props: accept `isStarred: boolean`, `onToggleStar: () => void`
- Extend `FirewallList`: fetch starred IDs, pass to each card, show filter toggle

</code_context>

<specifics>
## Specific Ideas

- Star stored server-side so it syncs across browsers (confirmed by user)
- Filter is on the firewall rules page only (confirmed by user — not on dashboard)
- Full list shows star indicator; filter hides unstarred rules entirely

</specifics>

<deferred>
## Deferred Ideas

- Starred rules section on dashboard — explicitly out of scope (user said filter on firewall page only)
- Bulk star/unstar — not requested

</deferred>
