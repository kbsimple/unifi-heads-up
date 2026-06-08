---
status: complete
task: 260607-instant-cache
date: 2026-06-07
---

# Instant Dashboard Load via SQLite Client Cache - Complete

## Summary

Implemented stale-while-revalidate caching so the dashboard loads instantly from
SQLite cache while the background recorder keeps data fresh.

## Changes

### Database (`src/lib/db/index.ts`)
- Added `latest_clients` table with all NetworkClient fields
- Added `upsertLatestClients()` - replaces all cached clients on each poll
- Added `getLatestClients(maxAgeMs)` - returns cached clients if fresh enough

### Recorder (`src/lib/db/recorder.ts`)
- Extended `startRecorder()` to call `upsertLatestClients()` after `insertSnapshots()`
- Cache updates every 60s on the same poll cycle as historical snapshots

### API Route (`src/app/api/clients/route.ts`)
- Implemented SWR pattern with three states:
  - **Fresh (< 60s old)**: Return immediately from cache, no UniFi API call
  - **Stale (≥ 60s old)**: Return cached data, trigger background refresh
  - **Miss (no cache)**: Fetch from UniFi synchronously, cache result
- Added `cacheStatus: 'hit' | 'stale' | 'miss'` to response
- Removed direct `getUnifiClients()` call for cached paths

### Tests
- `tests/lib/db/cache.test.ts` - 11 tests for upsert/get operations
- Updated `tests/app/api/clients/route.test.ts` - 6 tests for cache hit/stale/miss

## Result

- Dashboard loads instantly from SQLite cache (< 10ms)
- Background recorder updates cache every 60s
- First load after server start still requires UniFi API call (cache miss)
- All 317 tests pass