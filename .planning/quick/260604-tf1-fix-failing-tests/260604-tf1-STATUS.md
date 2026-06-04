---
status: complete
task: 260604-tf1
date: 2026-06-04
---

# Fix All Failing Tests - Complete

## Summary

Fixed all 28 failing tests by updating stale test expectations to match current source behavior.

## Test Files Modified (14 files)

### Task 1: Stale threshold/nav/badge/mock-path fixes (7 files)
- `tests/lib/unifi/traffic.test.ts` - Updated threshold tests for new ranges (medium 1-2, high >=2)
- `tests/app/(dashboard)/layout.test.tsx` - Fixed nav link paths (/dashboard, /dashboard/firewall)
- `tests/components/dashboard/client-card.test.tsx` - "Last active:" → "Last busy:"
- `tests/components/dashboard/client-list.test.tsx` - "Last Active" → "Last Busy" column
- `tests/app/api/firewall/route.test.ts` - Fixed assertion for 3-arg updateFirewallPolicy call
- `tests/app/dashboard/page.test.tsx` - Changed mock from @/lib/unifi/client to @/lib/unifi
- `tests/app/api/clients/route.test.ts` - Pass Request object to GET() for error cases

### Task 2: Middleware/firewall/integration fixes (3 files)
- `tests/middleware.test.ts` - Root "/" redirects to /login for unauthenticated users
- `tests/app/(dashboard)/firewall/page.test.tsx` - Changed mock path to @/lib/unifi
- `tests/integration/firewall-integration.test.tsx` - Added /api/firewall/starred handler, fixed "Disabled" assertion

### Task 3: Context/shape mismatch fixes (3 files)
- `tests/components/dashboard/format-last-active.test.tsx` - Added TrafficHistoryProvider mock, fixed "—" assertion
- `tests/components/dashboard/client-card-history.test.tsx` - Updated HistoryBucket shape (hourTs, avgMbps), fixed endpoint
- `tests/components/dashboard/client-table.test.tsx` - Fixed "—" count assertion

### Bonus fix discovered during verification
- `tests/lib/unifi/client.test.ts` - trafficStatus for 2 Mbps should be 'high', not 'low'

## Final Result

```
Test Files  41 passed (41)
Tests       305 passed (305)
```

## Root Causes

1. **Threshold changes** - Traffic thresholds were updated in a previous session but tests weren't updated
2. **Route restructuring** - Groups removal changed nav structure to /dashboard/*
3. **Label changes** - "Last active" → "Last busy" in UI components
4. **Mock path issues** - Tests mocked @/lib/unifi/client but source imports from @/lib/unifi barrel
5. **API signature changes** - GET/PUT routes now require Request argument, PUT passes 3 args
6. **Endpoint changes** - device-activity → device-history, new starred endpoint
7. **Context shape changes** - HourlyBucket → HistoryBucket with different fields