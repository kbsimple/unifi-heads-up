---
quick_id: 260717-rgt
slug: dashboard-bug-regression-tests
description: Add regression tests for dashboard rx/tx swap and DB-backed lastBusy fixes
date: 2026-07-17
status: in-progress
---

# Quick Task 260717-rgt: Regression Tests for Dashboard Bug Fixes

## Task 1: rx/tx mapping direction test (client.test.ts)

Add a test with asymmetric rx/tx values so that swapping them back would cause a failure.

- Input: `'rx_bytes-r': 500000, 'tx_bytes-r': 2000000`
- Assert: `downloadRate === 2000000` (tx = AP→device = device download)
- Assert: `uploadRate === 500000` (rx = device→AP = device upload)

File: `tests/lib/unifi/client.test.ts`

## Task 2: lastBusy enrichment test (route.test.ts)

Add a test that wires queryAllLastBusy to return a known timestamp and asserts it appears
on the returned client. Must import queryAllLastBusy from the mocked module.

- Setup: `queryAllLastBusy` returns `{ 'aa:bb:cc:dd:ee:ff': 1234567890000 }`
- Cache hit path: client.mac = 'aa:bb:cc:dd:ee:ff'
- Assert: `data.clients[0].lastBusy === 1234567890000`
- Cover both cache-hit and cache-miss paths

File: `tests/app/api/clients/route.test.ts`

## Task 3: queryAllLastBusy unit test (new file)

New test file exercising the query directly against an in-memory SQLite DB.

Seed data:
- Device A (mac: 'aa:bb:cc:dd:ee:01'): two snapshots, newest at t=1000 with
  download_bps=100000 + upload_bps=50000 = 150000 >= 125000 threshold
- Device B (mac: 'aa:bb:cc:dd:ee:02'): one snapshot with
  download_bps=50000 + upload_bps=60000 = 110000 < 125000 threshold (below medium)
- Device C (mac: 'aa:bb:cc:dd:ee:03'): two snapshots at t=500 and t=800,
  both above threshold; assert MAX(recorded_at)=800 is returned

Assertions:
- Device A appears in result with `lastBusy === 1000 * 1000` (unix ms)
- Device B does NOT appear in result
- Device C appears with `lastBusy === 800 * 1000`

File: `tests/lib/insights/queries.test.ts` (new)
