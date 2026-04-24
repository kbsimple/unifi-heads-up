---
phase: quick
plan: 260423-las
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/dashboard/client-card.tsx
  - src/components/dashboard/client-table.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Dashboard renders without TypeError after SWR revalidation"
    - "Last active time displays correctly for Date objects, ISO strings, and null"
  artifacts:
    - path: "src/components/dashboard/client-card.tsx"
      provides: "formatLastActive coercing Date | string | null"
      contains: "new Date(date)"
    - path: "src/components/dashboard/client-table.tsx"
      provides: "formatLastActive coercing Date | string | null"
      contains: "new Date(date)"
  key_links:
    - from: "SWR revalidation"
      to: "formatLastActive"
      via: "client.lastSeen passed as ISO string"
      pattern: "new Date\\(date\\)\\.getTime\\(\\)"
---

<objective>
Fix dashboard crash caused by `formatLastActive` calling `.getTime()` on an ISO string value.

Purpose: SWR rehydration deserializes Date fields to ISO strings. Both `client-card.tsx` and `client-table.tsx` have identical `formatLastActive(date: Date | null)` functions that call `date.getTime()` directly, throwing `TypeError: date.getTime is not a function` on post-revalidation renders.

Output: Updated `formatLastActive` in both files accepting `Date | string | null`, coercing with `new Date(date)` before calling `.getTime()`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Fix formatLastActive in client-card.tsx and client-table.tsx</name>
  <files>src/components/dashboard/client-card.tsx, src/components/dashboard/client-table.tsx</files>
  <behavior>
    - formatLastActive(null) → "Unknown"
    - formatLastActive(new Date()) → "just now"
    - formatLastActive("2026-04-23T10:00:00.000Z") → relative string without throwing
    - formatLastActive(new Date(Date.now() - 90 * 60 * 1000)) → "1h ago"
  </behavior>
  <action>
In BOTH files, update the `formatLastActive` function signature and body:

1. Change parameter type from `Date | null` to `Date | string | null`
2. Replace the direct `date.getTime()` call with a coerced value: `const d = date instanceof Date ? date : new Date(date)` then use `d.getTime()` instead of `date.getTime()`

Full replacement for both files — the function body after the null guard:

```typescript
function formatLastActive(date: Date | string | null): string {
  if (!date) return 'Unknown'

  const d = date instanceof Date ? date : new Date(date)
  const now = Date.now()
  const then = d.getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}
```

Do NOT change the `NetworkClient` type, component props, or any other code. This is a local function fix only.
  </action>
  <verify>
    <automated>cd /Users/ffaber/claude-projects/unifi-api && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Both files compile without TypeScript errors. `formatLastActive` accepts `Date | string | null` and coerces string inputs via `new Date(date)` before calling `.getTime()`.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| SWR cache → render | Deserialized JSON values (strings) passed where Date objects expected |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-las-01 | Tampering | formatLastActive | accept | Input is client.lastSeen from internal API — not user-controlled input. Invalid date strings produce NaN-based diffs which format as "NaNm ago"; acceptable for internal tooling. |
</threat_model>

<verification>
- TypeScript compiles cleanly (`npx tsc --noEmit`)
- `formatLastActive` in both files has `Date | string | null` signature
- `new Date(date)` coercion present before `.getTime()` call
- No changes outside the `formatLastActive` function body in either file
</verification>

<success_criteria>
Dashboard renders without TypeError after SWR revalidation. Both `client-card.tsx` and `client-table.tsx` handle ISO string `lastSeen` values gracefully.
</success_criteria>

<output>
After completion, create `.planning/quick/260423-las-fix-dashboard-lastseen-date-crash/260423-las-SUMMARY.md`
</output>
