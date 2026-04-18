# Phase 4: Enhanced Features - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 04-enhanced-features
**Areas discussed:** Groups UI location, Group creation/assignment UX, Historical trends display, Trend data storage
**Mode:** Auto (recommended designs selected autonomously)

---

## Groups UI Location

| Option | Description | Selected |
|--------|-------------|----------|
| Third tab "Groups" | Follows Dashboard/Firewall pattern, clear separation, easy discovery | ✓ |
| Dashboard section | Inline on main dashboard, no navigation change | |
| Filter/view toggle | Groups as a filter mode on existing device list | |

**User's choice:** Third tab "Groups" (auto-selected as recommended)
**Notes:** Maintains consistent navigation pattern established in Phase 3. Three tabs fit well in top nav.

---

## Group Creation/Assignment UX

| Option | Description | Selected |
|--------|-------------|----------|
| Modal dialog with checkboxes | Simple UX, non-technical users, doesn't clutter dashboard | ✓ |
| Inline form on Groups page | Always visible, no modal, but adds UI complexity | |
| Separate page | Full page for group management, more complex navigation | |

**User's choice:** Modal dialog with checkboxes (auto-selected as recommended)
**Notes:** Modal keeps groups page clean. Checkboxes familiar for multi-select. X button on device chips for removal.

---

## Historical Trends Display

| Option | Description | Selected |
|--------|-------------|----------|
| Expandable panel on client card | Charts on demand, keeps dashboard clean | ✓ |
| Separate "History" tab | Dedicated page for all charts, but requires navigation | |
| Modal on click | Chart in overlay, but loses context | |

**User's choice:** Expandable panel on client card (auto-selected as recommended)
**Notes:** Line/area chart for time-series is standard. 24 data points (hourly) for 24-hour window.

---

## Trend Data Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side accumulation (session) | Simple MVP, data lost on refresh, no backend needed | ✓ |
| Vercel Cron + KV storage | Persistent data, requires cron setup and KV addon | |
| LocalStorage | Persists across sessions, but limited capacity | |

**User's choice:** Client-side accumulation (auto-selected as recommended for MVP)
**Notes:** Samples captured every 60s during polling. Future enhancement: Vercel Cron for persistent history.

---

## Claude's Discretion

- shadcn Dialog for group creation modal
- Recharts AreaChart for traffic trends
- LocalStorage for group persistence (not trend data)
- Existing Card and Badge components for consistency

---

## Deferred Ideas

- **Persistent historical data** — Requires Vercel Cron + KV, deferred for future enhancement
- **Custom time ranges** — Would need server-side storage, out of scope for MVP
- **Group-based firewall rules** — New capability, could be its own phase

---

*Discussion completed: 2026-04-18*