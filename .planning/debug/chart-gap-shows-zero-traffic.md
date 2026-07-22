---
slug: chart-gap-shows-zero-traffic
status: awaiting_human_verify
created: 2026-07-21
updated: 2026-07-21
trigger: "Chart inconsistency: when no data point is recorded for a bucket (~5 min window), the time-series chart shows zero activity, but the High/Medium/Low badge still reflects the trailing-window activity reading. Chart is lying — zero means no traffic, but the truth is no measurement."
---

## Symptoms

- **Expected**: Chart should show gaps (null/undefined) when no data was recorded for a time bucket, not zero. Zero falsely implies no traffic occurred.
- **Actual**: Missing time buckets render as 0 on the chart. The badge (which uses a live trailing-window API reading, not the chart's bucketed history) may simultaneously show High or Medium.
- **Error messages**: None — purely a visual/data inconsistency.
- **Timeline**: Always been this way since charts were built.
- **Reproduction**: Expand a device's history in the dashboard. If there are gaps in the recorded history (no DB rows for certain 5-min buckets), those gaps appear as zero on the chart. Meanwhile the badge may still show High/Medium from the live trailing-window reading.
- **Data sources**: Badge = live trailing-window endpoint (separate from history DB). Chart = bucketed historical data from insights DB.

## Current Focus

hypothesis: "Missing time buckets are rendered as zero because fillBuckets in queries.ts (line 101) fills absent buckets with avgMbps: 0 via `?? 0`. This zero propagates unchanged through the API and chart transformation, causing Recharts to draw the line to zero instead of creating a gap."
next_action: "Apply fix: change `?? 0` to `?? null` in fillBuckets, update HistoryBucket type, update TrafficChartProps, add tests."

reasoning_checkpoint:
  hypothesis: "fillBuckets fills missing time buckets with avgMbps=0 (via `?? 0`), which propagates through the API and chart transform as bandwidth=0. Recharts draws a line to zero instead of breaking the line because 0 is a valid numeric value."
  confirming_evidence:
    - "queries.ts line 101: `return { bucketTs: ts, avgMbps: byBucket.get(ts) ?? 0 }` — explicit 0 for missing buckets"
    - "client-card.tsx lines 46-49: `bandwidth: b.avgMbps` — value passed directly, no null conversion"
    - "client-list.tsx lines 72-75: same pattern for site traffic non-24h windows"
    - "traffic-chart.tsx: Area has no connectNulls prop (defaults false) — null would create gaps, but data is 0 not null"
    - "TrafficChartProps accepts `bandwidth: number` — the 0 is a valid render value, not a sentinel"
  falsification_test: "After fix, navigating to a device with known history gaps should show a line break at the gap, not a zero-floor dip."
  fix_rationale: "Changing `?? 0` to `?? null` sends null to Recharts for missing buckets. Recharts AreaChart + Area with connectNulls=false (default) treats null as a gap and breaks the line, correctly representing missing measurement rather than zero traffic."
  blind_spots: "Haven't verified Recharts null handling at runtime (confident from docs). queryDeviceActivity uses a separate fill that intentionally keeps 0 for the heatmap — that function is not being changed."

## Evidence

- timestamp: 2026-07-21
  checked: queries.ts fillBuckets function
  found: "Line 101: `avgMbps: byBucket.get(ts) ?? 0` — missing buckets assigned 0"
  implication: Root cause. Zero propagates through to Recharts as a valid data point.

- timestamp: 2026-07-21
  checked: client-card.tsx, client-list.tsx chart data transforms
  found: "Both map `b.avgMbps` directly to `bandwidth` with no null handling"
  implication: No filtering occurs downstream; 0 reaches Recharts unchanged.

- timestamp: 2026-07-21
  checked: traffic-chart.tsx Area component
  found: "No connectNulls prop; Area defaults to connectNulls=false — null WOULD create gaps"
  implication: Fix only needs to be in fillBuckets (supply null) + type updates.

- timestamp: 2026-07-21
  checked: queryDeviceActivity function
  found: "Uses its own fill logic (not fillBuckets), intentionally assigns 0 and active=false for heatmap cells. Tests confirm this."
  implication: Must NOT change queryDeviceActivity — its behavior is correct for the heatmap.

## Eliminated

## Resolution

root_cause: "fillBuckets in queries.ts filled absent time buckets with avgMbps=0 via `?? 0`. Zero is a valid chart data point so Recharts drew the line to zero instead of breaking it, falsely implying zero traffic when no measurement existed."
fix: "Changed `?? 0` to `?? null` in fillBuckets. Updated HistoryBucket.avgMbps type to `number | null`. Updated TrafficChartProps.data to accept `number | null` for bandwidth. Recharts Area with default connectNulls=false now breaks the line at null values instead of drawing to zero."
verification: "383/383 tests pass. npx tsc --noEmit clean. New tests confirm missing buckets produce null; existing tests updated to assert null instead of 0 for empty/out-of-window data."
files_changed:
  - src/lib/insights/queries.ts
  - src/components/dashboard/traffic-chart.tsx
  - src/lib/insights/queries.test.ts
  - tests/lib/insights/queries.test.ts
