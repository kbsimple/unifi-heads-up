---
type: quick
task: 260607-instant-cache
description: Cache latest client data in SQLite for instant dashboard load
autonomous: true
---

<objective>
Implement instant dashboard load by caching latest client data in SQLite.
The background recorder already polls UniFi every 60s — extend it to store
full client data in a new `latest_clients` table, served from /api/clients
with stale-while-revalidate pattern.
</objective>

<context>
@src/lib/db/index.ts — current SQLite schema and insertSnapshots
@src/lib/db/recorder.ts — background poller (60s interval)
@src/app/api/clients/route.ts — current on-demand API
@src/lib/unifi/types.ts — NetworkClient type
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add latest_clients table to SQLite schema</name>
  <files>
    src/lib/db/index.ts
  </files>
  <action>
Add a new table `latest_clients` to store the most recent client data:

```sql
CREATE TABLE IF NOT EXISTS latest_clients (
  id TEXT PRIMARY KEY,
  mac TEXT NOT NULL,
  display_name TEXT NOT NULL,
  ip TEXT,
  last_seen INTEGER,
  is_wired INTEGER NOT NULL,
  is_guest INTEGER NOT NULL,
  download_rate INTEGER NOT NULL,
  upload_rate INTEGER NOT NULL,
  signal INTEGER,
  traffic_status TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_latest_clients_updated ON latest_clients (updated_at);
```

Add `upsertLatestClients(clients: NetworkClient[]): void` function that:
1. Starts a transaction
2. Deletes all existing rows
3. Inserts all clients with current timestamp
4. Commits

Add `getLatestClients(): { clients: NetworkClient[], timestamp: number } | null`
that reads from the table and returns null if empty or older than 5 minutes.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -E "latest_clients|upsertLatest|getLatest" || echo "No type errors"</automated>
  </verify>
  <done>
    TypeScript compiles without errors for the new functions.
  </done>
</task>

<task type="auto">
  <name>Task 2: Extend recorder to store latest clients</name>
  <files>
    src/lib/db/recorder.ts
  </files>
  <action>
Modify `startRecorder()` to also call `upsertLatestClients(clients)` after
`insertSnapshots(clients)`. The recorder already has the clients data from
`getUnifiClients()`, so just add the upsert call.

The flow becomes:
1. Poll UniFi API every 60s
2. Insert snapshots for historical data
3. Upsert latest_clients for instant cache

No new error handling needed — existing try/catch covers both calls.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <done>
    TypeScript compiles. Recorder now updates latest_clients on each poll.
  </done>
</task>

<task type="auto">
  <name>Task 3: Modify /api/clients to serve cached data with SWR</name>
  <files>
    src/app/api/clients/route.ts
  </files>
  <action>
Implement stale-while-revalidate pattern:

1. First, try `getLatestClients()` from SQLite
2. If cache exists and is fresh (< 60s old), return immediately
3. If cache is stale (≥ 60s) or missing, return cache anyway but trigger background refresh
4. If no cache at all, fetch from UniFi directly (first-load case)

The background refresh should:
- Call `getUnifiClients()` in a Promise that doesn't block the response
- On success, call `upsertLatestClients()` for next time
- Log errors but don't fail the request

Add a `cacheStatus` field to the response:
- `'hit'` — served from cache, fresh
- `'stale'` — served from cache, background refresh triggered
- `'miss'` — fetched from UniFi (no cache available)

Keep existing error handling for network/API errors on cache miss.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <done>
    TypeScript compiles. API returns cached data when available.
  </done>
</task>

<task type="auto">
  <name>Task 4: Write tests and verify full suite</name>
  <files>
    tests/lib/db/cache.test.ts
    tests/app/api/clients/route.test.ts
  </files>
  <action>
Add tests for the new caching behavior:

1. `tests/lib/db/cache.test.ts`:
   - `upsertLatestClients` inserts clients
   - `upsertLatestClients` replaces all on subsequent call
   - `getLatestClients` returns null for empty table
   - `getLatestClients` returns clients with timestamp

2. Update `tests/app/api/clients/route.test.ts`:
   - Mock `getLatestClients` to return cached data
   - Test cache hit returns immediately without calling `getUnifiClients`
   - Test cache miss falls back to UniFi API
   - Test stale cache returns cached data but triggers refresh

Run full test suite and verify all pass.
  </action>
  <verify>
    <automated>npx vitest run 2>&1 | tail -10</automated>
  </verify>
  <done>
    All tests pass. Cache hit/stale/miss paths verified.
  </done>
</task>

</tasks>

<success_criteria>
- Dashboard loads instantly from SQLite cache (< 10ms)
- Background recorder updates cache every 60s
- API returns `cacheStatus: 'hit'|'stale'|'miss'` in response
- All existing tests continue to pass
- New cache tests cover upsert/get paths
</success_criteria>

<output>
After completion, create `.planning/quick/260607-instant-cache/STATUS.md`
with a brief summary of the implementation.
</output>