# Phase 3: Firewall Control - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can control network access by toggling existing firewall rules. This phase delivers a firewall rules view with toggle controls — viewing all rules, their current enabled/disabled status, and a simple switch to enable/disable each rule. Does not include creating new rules (out of scope per PROJECT.md).

</domain>

<decisions>
## Implementation Decisions

### UI Location
- **D-01:** New tab in top navigation bar — Firewall tab alongside Dashboard tab for clear separation and easy discovery
- **D-02:** Top nav will have two tabs: "Dashboard" (devices) and "Firewall" (rules)

### Rule Display
- **D-03:** Card list format — each firewall rule displayed as a card with rule name, enabled status indicator, and toggle switch
- **D-04:** Consistent with Phase 2 device cards — same Card component, same dark theme styling (bg-zinc-900, border-zinc-800)

### Toggle UX
- **D-05:** Optimistic updates — switch animates immediately on click, API call happens in background
- **D-06:** Error handling — toast notification on failure with automatic revert of switch to previous state
- **D-07:** No confirmation dialog — simple toggle experience as per requirement "simple switch control"

### Rule Information
- **D-08:** Minimal display — show only rule name and enabled/disabled status
- **D-09:** Keep it simple for non-technical family users — no action/zone/protocol details unless requested

### API Approach
- **D-10:** Zone-Based Firewall (ZBF) detection required — check `site-feature-migration` endpoint first
- **D-11:** If ZBF enabled: use `/proxy/network/v2/api/site/default/firewall-policies` endpoints
- **D-12:** If ZBF disabled: use legacy `/proxy/network/v2/api/site/default/stat/firewallrule` endpoint
- **D-13:** Toggle via PUT request to `/firewall-policies/{policy_id}` with `enabled: true|false` body

### Claude's Discretion
- shadcn Switch component for toggle control (add via `npx shadcn@latest add switch`)
- SWR with mutation for optimistic updates (pattern from Phase 2)
- Server Action for firewall toggle mutation (pattern from Phase 1)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Configuration
- `CLAUDE.md` — Tech stack (Next.js, React 19, Tailwind CSS 4, TypeScript 6), Site Manager Proxy connectivity

### Requirements
- `.planning/REQUIREMENTS.md` — FWRC-01 through FWRC-04 (firewall control requirements)
- `.planning/PROJECT.md` — Core value (visibility and control), constraints (toggle existing rules only)

### Prior Phase Context
- `.planning/phases/01-foundation-authentication/01-CONTEXT.md` — Auth patterns, error handling, toast notifications, API client pattern
- `.planning/phases/02-dashboard-traffic-monitoring/02-CONTEXT.md` — Dashboard patterns, SWR usage, card components

### External References
- `https://developer.ui.com/site-manager-api/` — UniFi Site Manager API documentation
- `https://github.com/enuno/unifi-mcp-server/blob/a2923dd2/src/tools/firewall_policies.py` — Reference implementation for firewall policy operations

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/unifi/client.ts` — UniFi API client pattern with ky + Zod validation
- `src/lib/unifi/types.ts` — Type definitions pattern, extend for firewall policies
- `src/components/ui/card.tsx` — Card component for rule display
- `src/components/ui/badge.tsx` — Badge component for status indicator
- `src/components/ui/sonner.tsx` — Toast notifications for errors
- `src/app/(dashboard)/layout.tsx` — Dashboard layout with top nav (extend for tabs)

### Established Patterns
- Server Component for initial data fetch (pattern from Phase 2 dashboard)
- SWR with `useSWR` for client-side polling/mutations
- Server Actions for mutations (login pattern from Phase 1)
- `server-only` package for API security

### Integration Points
- Top navigation: Add "Firewall" tab link
- New route: `src/app/(dashboard)/firewall/page.tsx` for firewall rules view
- New API route or extend client: `getFirewallPolicies()`, `updateFirewallPolicy()`

</code_context>

<specifics>
## Specific Ideas

- Firewall tab in top nav, same styling as "Dashboard" (or use Next.js Link with active state)
- Rule cards: name on left, switch on right, subtle enabled/disabled badge
- Switch component from shadcn: install via `npx shadcn@latest add switch`
- Optimistic update: use SWR's `mutate` with rollback on error
- Toast message on failure: "Failed to update rule. Changes reverted."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---
*Phase: 03-firewall-control*
*Context gathered: 2026-04-18*