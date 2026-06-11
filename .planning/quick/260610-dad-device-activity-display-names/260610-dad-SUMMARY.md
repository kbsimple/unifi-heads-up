---
status: complete
quick_id: 260610-dad
date: 2026-06-10
commit: c255727
---

## Summary

Fixed the Device Activity dropdown on the Insights tab to show client display names instead of truncated MAC addresses.

**Root cause:** `device-activity-heatmap.tsx` used a local `shortMac()` helper (last 8 chars of MAC) in both the dropdown options and the "Showing: ..." header label. The `TopDevice` type already carries `displayName?: string` — used correctly in the Top Devices chart — but the heatmap ignored it.

**Fix:** Replaced `shortMac(d.mac)` with `d.displayName ?? d.mac` in the dropdown, and looked up `displayName` by MAC for the header label. Removed the now-unused `shortMac` function.

**Commit:** `c255727` — fix: show client display names in Device Activity dropdown (Insights tab)
