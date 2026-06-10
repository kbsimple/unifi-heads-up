---
status: complete
quick_id: 260610-icb
date: 2026-06-10
commit: 21d36c0
---

## Summary

Fixed the white overlay rectangles that appeared on the insights tab bar chart when clicking a bar.

**Root cause:** Recharts default `cursor` prop (full-chart white rectangle on hover) and `activeBar` prop (per-bar white stroke outline on click) were both active. Neither was needed since selection is communicated via `Cell` fill color (`#38bdf8` selected, `#0ea5e9` default).

**Fix:** Added `cursor={false}` to `<BarChart>` and `activeBar={false}` to `<Bar>` in `src/components/insights/top-devices-chart.tsx`.

**Result:** No visual regressions — click behavior and selection highlight still work; the distracting white overlays are gone.

**Commit:** `21d36c0` — fix: suppress Recharts default cursor and activeBar overlays on insights bar chart
