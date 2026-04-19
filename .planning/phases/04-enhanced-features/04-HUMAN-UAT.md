---
status: partial
phase: 04-enhanced-features
source: [04-VERIFICATION.md]
started: 2026-04-18T20:00:00Z
updated: 2026-04-18T20:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Group persistence across refresh
expected: Create a group, refresh the page — group still appears with same name and devices
result: [pending]

### 2. Group creation + traffic aggregation rendering
expected: Create a group containing active devices — group card shows a colored TrafficBadge (High/Medium/Low) in the header reflecting aggregate bandwidth
result: [pending]

### 3. Device remove from group
expected: Click the X on a DeviceChip inside a GroupCard — chip disappears immediately, device no longer in group after refresh
result: [pending]

### 4. Per-client traffic history expansion
expected: Click "History" expand on a ClientCard — Recharts AreaChart renders with hourly data points after a few SWR poll cycles
result: [pending]

### 5. Site traffic section visibility
expected: After sufficient poll cycles (or crossing an hour boundary), the site-wide traffic history section appears above the client list with an AreaChart
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
