---
phase: quick
plan: 260516-srt
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/unifi/traffic.ts
  - src/components/dashboard/client-table.tsx
  - tests/lib/unifi/traffic.test.ts
  - tests/components/dashboard/client-table.test.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Dashboard table preserves the order clients arrive from the API with no column highlighted as sorted"
    - "Traffic status idle is triggered below 0.5 Mbps, low from 0.5–1 Mbps, med from 1–5 Mbps, high at 5 Mbps and above"
    - "Status tooltip text in the table header reflects the new thresholds"
  artifacts:
    - path: src/lib/unifi/traffic.ts
      provides: Updated TRAFFIC_THRESHOLDS constants
      contains: "IDLE: 0.5"
    - path: src/components/dashboard/client-table.tsx
      provides: No default sort applied on mount
      contains: "sortColumn: null"
    - path: tests/lib/unifi/traffic.test.ts
      provides: Tests aligned to new thresholds
    - path: tests/components/dashboard/client-table.test.tsx
      provides: Tests aligned to no-default-sort behavior
  key_links:
    - from: src/lib/unifi/traffic.ts
      to: TRAFFIC_THRESHOLDS
      via: calculateTrafficStatus
      pattern: "TRAFFIC_THRESHOLDS\\.IDLE"
    - from: src/components/dashboard/client-table.tsx
      to: sorted array
      via: sortColumn state
      pattern: "sortColumn"
---

<objective>
Two small behavioral updates to the network dashboard:
1. Remove the default sort on the client table so the API order is preserved on load.
2. Tighten the traffic status thresholds to be more sensitive to low-bandwidth activity.

Purpose: The API returns clients in a meaningful order and applying an alphabetical sort discards that. The old thresholds (idle < 1 Mbps, high > 100 Mbps) were too coarse for a home network where most activity is under 10 Mbps.
Output: Updated source files and updated tests — all green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/lib/unifi/traffic.ts
@src/components/dashboard/client-table.tsx
@tests/lib/unifi/traffic.test.ts
@tests/components/dashboard/client-table.test.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update traffic thresholds and tooltip text</name>
  <files>src/lib/unifi/traffic.ts, src/components/dashboard/client-table.tsx</files>
  <action>
In src/lib/unifi/traffic.ts:
- Change TRAFFIC_THRESHOLDS to:
    IDLE: 0.5,  // < 0.5 Mbps
    LOW: 1,     // 0.5–1 Mbps
    MEDIUM: 5,  // 1–5 Mbps
    // HIGH: >= 5 Mbps
- Update the JSDoc comments to match the new ranges.

In src/components/dashboard/client-table.tsx:
- Update the STATUS_TOOLTIP constant from:
    'Idle: <1 Mbps · Low: 1–10 Mbps · Medium: 10–100 Mbps · High: >100 Mbps'
  to:
    'Idle: <0.5 Mbps · Low: 0.5–1 Mbps · Medium: 1–5 Mbps · High: ≥5 Mbps'
  </action>
  <verify>npx tsc --noEmit 2>&1 | head -20</verify>
  <done>No TypeScript errors; TRAFFIC_THRESHOLDS.IDLE === 0.5, TRAFFIC_THRESHOLDS.LOW === 1, TRAFFIC_THRESHOLDS.MEDIUM === 5; tooltip string updated.</done>
</task>

<task type="auto">
  <name>Task 2: Remove default sort from client table</name>
  <files>src/components/dashboard/client-table.tsx</files>
  <action>
The goal is to preserve API order by default — no column is pre-sorted on mount.

Changes to src/components/dashboard/client-table.tsx:

1. Change the SortColumn type to allow null:
   type SortColumn = 'displayName' | 'ip' | 'mac' | 'trafficStatus' | 'lastBusy' | null

2. Change initial state:
   const [sortColumn, setSortColumn] = useState<SortColumn>(null)
   const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

3. Update the handleSort function — when sortColumn is null, clicking a column sets it to that column with 'asc':
   function handleSort(column: Exclude<SortColumn, null>) {
     if (column === sortColumn) {
       setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
     } else {
       setSortColumn(column)
       setSortDirection('asc')
     }
   }

4. Update the sorted computation — when sortColumn is null, skip sorting (return clients in original order):
   const sorted = sortColumn === null
     ? clients
     : [...clients].sort((a, b) => {
         let cmp = 0
         switch (sortColumn) {
           case 'displayName':
             cmp = a.displayName.localeCompare(b.displayName)
             break
           case 'ip':
             cmp = ipToNum(a.ip) - ipToNum(b.ip)
             break
           case 'mac':
             cmp = a.mac.localeCompare(b.mac)
             break
           case 'trafficStatus':
             cmp = STATUS_ORDER[a.trafficStatus] - STATUS_ORDER[b.trafficStatus]
             break
           case 'lastBusy': {
             const aTime = getClientLastBusy(a.id) ?? 0
             const bTime = getClientLastBusy(b.id) ?? 0
             cmp = aTime - bTime
             break
           }
         }
         return sortDirection === 'asc' ? cmp : -cmp
       })

5. Update the SortIndicator component — when column !== sortColumn (including when sortColumn is null), show the inactive ↕ indicator. The existing logic `if (column !== sortColumn) return ...` already handles null correctly since no non-null column equals null.

6. Update all five onClick handlers to pass the non-null column literal directly (the type signature change keeps them correct as-is, since the literals are always non-null).
  </action>
  <verify>npx tsc --noEmit 2>&1 | head -20</verify>
  <done>No TypeScript errors; on mount sortColumn is null and clients render in their original API order; clicking a header activates that sort.</done>
</task>

<task type="auto">
  <name>Task 3: Update tests to match new thresholds and no-default-sort behavior</name>
  <files>tests/lib/unifi/traffic.test.ts, tests/components/dashboard/client-table.test.tsx</files>
  <action>
In tests/lib/unifi/traffic.test.ts — update test descriptions and byte values to match new thresholds:

- "should return idle for less than 1 Mbps" → "should return idle for less than 0.5 Mbps"
  Input (0, 0) still returns 'idle' — no byte change needed.

- "should return low for 1-10 Mbps" → "should return low for 0.5–1 Mbps"
  Old: calculateTrafficStatus(125000, 125000) = 2 Mbps → was 'low', still 'low'. Keep the assertion, update description.
  Add an explicit test: calculateTrafficStatus(31250, 0) = 0.25 Mbps → 'idle' (below 0.5).
  Add: calculateTrafficStatus(62500, 0) = 0.5 Mbps → 'low' (at boundary).

- "should return medium for 10-100 Mbps" → "should return medium for 1–5 Mbps"
  Old input: calculateTrafficStatus(3125000, 3125000) = 50 Mbps → now returns 'high'.
  Change to: calculateTrafficStatus(187500, 187500) = 3 Mbps → 'medium'.

- "should return high for over 100 Mbps" → "should return high for 5 Mbps and above"
  Old input: calculateTrafficStatus(12500000, 12500000) = 200 Mbps → still 'high'.
  Change to: calculateTrafficStatus(312500, 0) = 2.5 Mbps → 'medium' (just under 5 Mbps). Then add calculateTrafficStatus(625000, 0) = 5 Mbps → 'high' (at boundary).

- "should combine download and upload rates" — old: (625000, 1875000) = 20 Mbps → was medium, now high. Update the assertion to 'high' or pick new values that land in medium: (62500, 62500) = 1 Mbps → 'medium'.

- "should handle asymmetric traffic" — old: (6250000, 0) = 50 Mbps → was medium, now high. Update assertion to 'high', or use (250000, 0) = 2 Mbps → 'medium'. Update both description and assertion.

In tests/components/dashboard/client-table.test.tsx — update the default-sort test group:

The "ClientTable default sort" describe block currently asserts that Apple appears first (because default sort is displayName asc). With no default sort, the API order is preserved: CLIENTS is declared as [Zebra, Apple, Mango], so rows[1] = Zebra, rows[2] = Apple, rows[3] = Mango.

- "default sort is by displayName ascending — Apple before Zebra" → rename to "no default sort — preserves API order (Zebra first)". Change assertions: rows[1] to have text 'Zebra', rows[3] to have text 'Mango'.

- "Device Name header shows ↑ (active asc) by default" → this test now fails (no column is active). Replace with: "all columns show ↕ by default". Assert screen.getAllByText('↕').length === 5 (all five columns inactive).

- "inactive columns show ↕" → old assertion: 4 inactive columns. With no default sort there are 5, so this is now covered by the test above. Remove this test or change its assertion to 5.

Run all tests to confirm green:
  npx vitest run tests/lib/unifi/traffic.test.ts tests/components/dashboard/client-table.test.tsx
  </action>
  <verify>npx vitest run tests/lib/unifi/traffic.test.ts tests/components/dashboard/client-table.test.tsx 2>&1 | tail -20</verify>
  <done>All tests in both files pass. No skipped tests. npx tsc --noEmit also clean.</done>
</task>

</tasks>

<verification>
After all tasks:
1. npx tsc --noEmit — zero errors
2. npx vitest run tests/lib/unifi/traffic.test.ts tests/components/dashboard/client-table.test.tsx — all pass
3. Spot check: TRAFFIC_THRESHOLDS.IDLE === 0.5 in traffic.ts
4. Spot check: initial sortColumn state is null in client-table.tsx
</verification>

<success_criteria>
- Traffic thresholds set to: idle < 0.5 Mbps, low 0.5–1 Mbps, medium 1–5 Mbps, high >= 5 Mbps
- Status tooltip updated to reflect new thresholds
- Client table renders in API order on load (no column pre-sorted)
- All existing tests updated and passing
- TypeScript clean
</success_criteria>

<output>
After completion, create `.planning/quick/260516-srt-update-sort-order-and-status-thresholds/260516-srt-STATUS.md` with:
- Tasks completed
- Files modified
- Test results summary
- Commit hash
</output>
