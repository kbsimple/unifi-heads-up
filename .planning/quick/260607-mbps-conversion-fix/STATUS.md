# Quick Task: Fix Mbps conversion bug (8x too low on dashboard charts)

**Status:** DONE — verified (311/311 tests pass, no new type errors), committed as dc11dad. Push pending user confirmation.

## Issue (reported by user)
Dashboard client/site traffic charts showed bandwidth ~8x lower than reality
(e.g., Netflix streaming showed ~0.5 "Mbps" when real usage is ~4 Mbps).

## Root cause
`NetworkClient.downloadRate`/`uploadRate` (and the `download_bps`/`upload_bps`
SQLite columns derived from them) store **bytes per second** — they come
straight from UniFi's `rx_bytes-r`/`tx_bytes-r`. Converting bytes/sec to
Megabits/sec requires `* 8 / 1_000_000`. Three call sites divided by
`1_000_000` directly, omitting the `* 8`, so displayed "Mbps" was actually
MB/s — exactly 1/8th of the real value. The existing helper
`bytesPerSecToMbps()` in `src/lib/unifi/traffic.ts` already had the correct
formula; it just wasn't being used consistently.

## Files already fixed (uncommitted, in working tree)
1. `src/lib/insights/queries.ts`
   - `queryDeviceHistory` SQL: added `* 8` to `(AVG(download_bps) + AVG(upload_bps)) ... / 1000000.0`
   - `queryDeviceActivity` SQL: same `* 8` fix
   - Updated the doc comment above `queryDeviceActivity` describing the formula
2. `src/components/dashboard/client-list.tsx`
   - Site traffic chart: replaced inline `(avgDownload + avgUpload) / 1_000_000`
     with `bytesPerSecToMbps(sample.avgDownload + sample.avgUpload)` (imported
     from `@/lib/unifi/traffic`)
3. `src/lib/insights/queries.test.ts` — updated 3 test expectations that had
   encoded the same wrong assumption (raw bytes/sec treated as already-Mbps):
   - "calculates avgMbps correctly": `3_000_000 + 2_000_000 bytes/sec` now
     expected to yield `40.0 Mbps` (was asserting `5.0`)
   - "marks active=true when avgMbps >= 0.5": changed insert values to
     `31_250 + 31_250` bytes/sec (= exactly 0.5 Mbps after `*8/1e6`)
   - "marks active=false when avgMbps < 0.5": changed insert values to
     `25_000 + 25_000` bytes/sec (= 0.4 Mbps), updated comment

Verified so far: `npx vitest run src/lib/insights/queries.test.ts
tests/components/dashboard/client-list-site-history.test.tsx` → 14/14 pass.

## Remaining steps to complete this task
1. Run full suite: `npx vitest run` — confirm all 311 tests still pass
2. Type check: `npx tsc --noEmit` — confirm no NEW errors (pre-existing
   `firewall.test.ts` undici Response-type errors are expected/acceptable,
   dating to commit 7094034 from 2026-05-17)
3. Commit the 3 changed files (`queries.ts`, `queries.test.ts`,
   `client-list.tsx`) with a message explaining the bytes→Mbps fix
   - NOTE: do NOT bundle `.planning/STATE.md` (pre-existing unrelated
     modification already in the working tree before this task started)
4. Push to `origin/main` if user confirms (ask first — visible to others)

## Notes for resuming
- No backfill needed — the bug was purely in the *read-side* aggregation
  (SQL queries / chart math), not in what's stored. Existing snapshot data
  in `data/snapshots.db` is correct; only the display calculation was wrong.
  Numbers will read correctly immediately once this fix ships.
- Git author convention: `Faiser <keepbreakfastsimple@gmail.com>` (note: NOT
  "breakstack" — a previous commit (909f46d) had this typo and was already
  amended + force-pushed to fix it, see commit 3912e83).
