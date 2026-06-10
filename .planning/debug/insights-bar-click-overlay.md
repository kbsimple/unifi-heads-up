---
status: resolved
trigger: "Clicking a bar in the insights tab shows an odd overlay on the page and doesn't do much"
created: 2026-06-10
updated: 2026-06-10
---

## Symptoms

- **Expected:** Unknown — user is not sure what clicking a bar should do
- **Actual:** A white rectangle outlines the entire bar chart area (for all charts on the page), plus a second white outline rectangle appears around the specific bar that was clicked
- **Errors:** Unknown — user is on mobile and cannot check browser console
- **Timeline:** Always broken — never worked
- **Reproduction:** Navigate to insights tab, click any bar in a bar graph

## Current Focus

hypothesis: "Recharts default activeBar and cursor styles firing on click/interaction"
test: "Suppress both via activeBar={false} on Bar and cursor={false} on BarChart"
expecting: "No white overlays after clicking a bar"
next_action: "fix applied"
reasoning_checkpoint: "BarChart has no cursor={false}; Bar has no activeBar={false}"
tdd_checkpoint: ""

## Evidence

- timestamp: 2026-06-10T00:00:00Z
  file: src/components/insights/top-devices-chart.tsx
  note: >
    BarChart does not pass cursor={false}. Recharts default cursor renders a semi-transparent
    white rectangle behind the entire bar group area on hover/click — this is the full-chart overlay.
    Bar does not pass activeBar={false}. Recharts default activeBar adds a white stroke outline
    around the specific clicked/active bar — this is the second per-bar outline.
    The onClick handler on Bar only calls onSelectDevice; no state drives a custom highlight beyond
    Cell fill color. Both default visual behaviors are purely cosmetic noise from Recharts defaults.

## Eliminated

- CSS/Tailwind overlay: no classes on BarChart or its wrapper produce white rectangles
- Custom onClick side effects: the handler only calls setSelectedMac, no DOM manipulation
- Cell fill logic: fills are #38bdf8 (selected) / #0ea5e9 (default), not white

## Resolution

root_cause: >
  Recharts BarChart default cursor prop renders a white rectangle over the full chart area on
  hover/interaction. Recharts Bar default activeBar prop adds a white stroke outline around the
  active (clicked) bar. Neither is disabled in the current component, so both fire on every click.
fix: >
  Add cursor={false} to BarChart and activeBar={false} to Bar in top-devices-chart.tsx.
  This suppresses both default visual overlays while preserving the onClick handler and the
  Cell-based fill highlight for the selected device.
verification: "Click a bar — no white rectangles appear; selected bar color still changes to #38bdf8"
files_changed: "src/components/insights/top-devices-chart.tsx"
