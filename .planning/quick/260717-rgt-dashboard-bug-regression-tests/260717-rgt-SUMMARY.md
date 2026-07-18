---
quick_id: 260717-rgt
slug: dashboard-bug-regression-tests
status: complete
date: 2026-07-17
commits:
  - bd53de4
---

# Quick Task 260717-rgt: Regression Tests for Dashboard Bug Fixes

## What was done

### 1. rx/tx direction test — `tests/lib/unifi/client.test.ts`

Added a test with asymmetric values (`rx_bytes-r: 500000, tx_bytes-r: 2000000`).
Asserts `downloadRate === 2000000` and `uploadRate === 500000`. Swapping the
mapping back would immediately fail this test.

### 2. lastBusy enrichment tests — `tests/app/api/clients/route.test.ts`

Added import of `queryAllLastBusy` from the mocked module and three new tests:
- **cache-hit path**: queryAllLastBusy returns a known timestamp → client gets it
- **cache-miss path**: same assertion on the fresh-fetch path
- **no DB record**: queryAllLastBusy returns `{}` → client.lastBusy stays null

### 3. queryAllLastBusy unit tests — `tests/lib/insights/queries.test.ts` (new)

Six tests against an in-memory SQLite DB:
1. Returns unix ms for device above threshold
2. Omits devices below 125000 bytes/sec (110000 = below)
3. Returns MAX(recorded_at) across multiple qualifying snapshots
4. Ignores non-qualifying snapshots when finding the MAX
5. Handles multiple devices in one query correctly
6. Returns empty object when table is empty

## Result

329/329 tests passing (10 new tests added, 0 regressions).
