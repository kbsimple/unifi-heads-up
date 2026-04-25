---
status: partial
phase: 06-local-api-client
source: [06-VERIFICATION.md]
started: 2026-04-24
updated: 2026-04-24
---

## Current Test

awaiting live-hardware verification in Phase 7

## Tests

### 1. Mock path dev server
expected: Run `./dev.sh`, dashboard loads with mock data, firewall rule toggle works in-memory
result: [pending — requires local dev run]

### 2. Live console device data
expected: Set real UNIFI_HOST + UNIFI_API_KEY, real devices appear in dashboard, no TLS errors in server console (LOCAL-01, LOCAL-02, LOCAL-03)
result: [deferred — requires LAN access to UniFi console, available in Phase 7]

### 3. Firewall toggle persistence
expected: Toggle a rule in the app, confirm it shows changed in UniFi OS admin UI (LOCAL-04)
result: [deferred — requires live UniFi hardware, available in Phase 7]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
