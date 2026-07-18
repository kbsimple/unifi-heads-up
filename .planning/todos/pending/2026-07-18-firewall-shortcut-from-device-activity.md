---
created: 2026-07-18T00:00:00Z
title: Firewall shortcut from device activity view
area: ux
files:
  - src/app/dashboard/page.tsx
  - src/components/client-table.tsx
  - src/app/dashboard/firewall/page.tsx
---

## Problem

When a user drills into a device's traffic activity (expanded row / history chart), there is no way to act on what they see. If they want to block that device they must navigate away to the Firewall page, find the relevant rule, and toggle it — breaking the flow entirely.

## Solution

In the expanded device row (where the traffic chart is shown), surface the firewall rules that apply to that device. At minimum, show a list of matching rules with their current enabled/disabled state and an inline toggle — the same toggle that exists on the Firewall page, but scoped to this device.

### Implementation sketch

1. **Rule matching** — when expanding a device row, fetch (or derive from already-loaded firewall state) which firewall rules reference that device's MAC, IP, or a group the device belongs to.
2. **Inline toggle** — render a compact rule list beneath (or alongside) the traffic chart. Each entry shows the rule name and a toggle. Reuse the existing Server Action that powers the Firewall page toggle.
3. **Firewall page link** — add a "Manage all rules →" link that deep-links to the Firewall page for users who want the full view.

### Acceptance criteria

- Expanding a device row shows any firewall rules that apply to that device.
- The toggle works without navigating away.
- If no rules apply, the section is hidden (no empty state noise).
- Toggling a rule here is reflected immediately on the Firewall page (shared state / revalidation).
