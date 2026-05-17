# Phase 3: Firewall Control - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 03-firewall-control
**Areas discussed:** UI Location, Rule Display, Toggle UX, Rule Info

---

## UI Location

| Option | Description | Selected |
|--------|-------------|----------|
| New tab in top nav | Add 'Firewall' tab alongside dashboard — clear separation, easy to find | ✓ |
| Section on main dashboard | Add firewall cards below device list — single page, but may get long | |
| Separate page with link | Dashboard has a 'Manage Firewall' button that navigates to dedicated page | |

**User's choice:** New tab in top nav
**Notes:** Recommended option selected — provides clear separation and easy discovery

---

## Rule Display

| Option | Description | Selected |
|--------|-------------|----------|
| Card list | Consistent with device cards — each rule as a card with name, status, toggle switch | ✓ |
| Table with toggle column | Compact rows — good for many rules, but less mobile-friendly | |
| Grouped by zone/purpose | Group rules by source/destination zones — requires extra API data | |

**User's choice:** Card list
**Notes:** Consistent with Phase 2 device cards, mobile-friendly

---

## Toggle UX

| Option | Description | Selected |
|--------|-------------|----------|
| Switch with optimistic update | Switch animates immediately, API call in background, toast on error with revert | ✓ |
| Switch with loading spinner | Show spinner during API call, switch animates on success — slower feedback | |
| Confirmation dialog before toggle | Ask 'Enable/disable this rule?' before acting — safer but extra step | |

**User's choice:** Switch with optimistic update
**Notes:** Provides instant feedback, error handling with revert

---

## Rule Info

| Option | Description | Selected |
|--------|-------------|----------|
| Name + enabled status only | Keep it simple — rule name and on/off switch, matching 'simple toggle' requirement | ✓ |
| Name, status, action (allow/block) | Show what the rule does — helpful context for non-technical users | |
| Full details (name, status, zones, action, protocol) | Show all available data — may overwhelm non-technical users | |

**User's choice:** Name + enabled status only
**Notes:** Minimal display for non-technical family users

---

## Claude's Discretion

- shadcn Switch component for toggle control
- SWR with mutation for optimistic updates
- Server Action for firewall toggle mutation

## Deferred Ideas

None — discussion stayed within phase scope.