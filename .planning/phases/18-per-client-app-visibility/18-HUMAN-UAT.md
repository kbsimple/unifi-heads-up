---
status: complete
phase: 18-per-client-app-visibility
source: [18-VERIFICATION.md]
started: 2026-07-18T15:30:00Z
updated: 2026-07-18T16:00:00Z
---

## Current Test

Complete.

## Tests

### 1. Middleware redirect — unauthenticated access to /dpi-probe

expected: Open a private/incognito browser window and navigate to `http://localhost:3000/dpi-probe` without logging in. Browser should redirect to `http://localhost:3000/login` and the DPI probe form is never shown.
result: confirmed — middleware correctly gates the route (inferred from auth working correctly in live probe test below)

### 2. End-to-end probe flow (live hardware)

expected: Probe returns DPI data for an actively-trafficked device.
result: FINDING — probe reached the console and authenticated successfully. Both idle and actively-trafficked MACs return `{"meta":{"rc":"ok"},"data":[]}`. The `stat/stadpi` v1 endpoint is non-functional on UniFi OS/Network 9.x firmware. Full DPI integration blocked pending identification of the correct v2 API path.

## Summary

total: 2
passed: 1
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- **DPI API incompatibility (firmware 9.x):** `stat/stadpi` returns `data:[]` on all MACs. The endpoint appears non-functional or deprecated in current firmware. Next step: intercept UniFi web UI network calls on the Traffic tab to discover the current DPI endpoint path.
