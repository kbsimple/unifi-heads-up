---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Statefulness & Insights
status: in_progress
stopped_at: Phase 10 human-verify checkpoint — awaiting UI confirmation
last_updated: "2026-05-16T00:00:00.000Z"
last_activity: 2026-05-16 — Phases 8, 9, 10 executed; awaiting Phase 10 human verification
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
  percent: 85
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-24)

**Core value:** Visibility and control over home network traffic — users must be able to see which devices are actively using bandwidth and pause/resume internet access for specific devices or groups.
**Current focus:** v3.0 Statefulness & Insights — SQLite traffic history, starred firewall rules, and multi-day insights page

## Current Position

Phase: Phase 10 — Insights Page
Plan: 10-03 (human-verify checkpoint)
Status: Awaiting human UI verification
Last activity: 2026-05-17 - Completed quick task 260517-jq1: Fix rule-toggle SWR optimistic update shape mismatch (blank page on toggle)

Progress: [████████░░] 85%

## Performance Metrics

**Velocity:**

- Total plans completed: 16 (v1.0) + 2 (v1.1) + 6 (v2.0) = 24
- Average duration: N/A
- Total execution time: 0 hours (v3.0)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 8. SQLite Snapshot Infrastructure | TBD | - | - |
| 9. Starred Firewall Rules | TBD | - | - |
| 10. Insights Page | TBD | - | - |

**Recent Trend:**

- Last 5 plans: N/A
- Trend: N/A

*Updated after each plan completion*
| Phase 06-local-api-client P01 | 8 | 3 tasks | 4 files |
| Phase 06-local-api-client P02 | 12 | 1 tasks | 3 files |
| Phase 06-local-api-client P03 | 5 | 3 tasks | 1 files |
| Phase 08-sqlite-snapshot-infrastructure P01 | 65 | 3 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v1.1 roadmap: single Phase 5 for all 8 MOCK requirements — all are one coherent delivery unit
- Mock intercepts at client.ts level — `getNetworkClients()`, `getFirewallPolicies()`, `updateFirewallPolicy()` replaced when `UNIFI_MOCK=true`
- In-memory toggle state: module-level variable in mock module, resets on server restart (intentional)
- dev.sh wires `UNIFI_MOCK=true` automatically — no manual env var management needed in dev
- [Phase 06-local-api-client]: Wave 0 tests RED against ky client — intentional, turns GREEN after Plan 02 ships undici client
- [Phase 06-local-api-client]: .env.local.example added to .gitignore exception (placeholders only, safe to commit)
- [Phase 06-local-api-client]: undici.Agent singleton at module init — not per request (D-03); rejectUnauthorized: false scoped to Agent only, no NODE_TLS_REJECT_UNAUTHORIZED (D-02)
- [Phase 06-local-api-client]: baseUrl() reads process.env.UNIFI_HOST inside function body so tests can mutate process.env between cases
- [Phase 06-local-api-client]: Live-hardware verification (LOCAL-01..04) deferred to Phase 7 Docker deployment — no LAN hardware accessible during automated execution
- [Phase 06-local-api-client]: Phase 6 declared partially complete — undici client unit suite GREEN, live-hardware UAT pending
- [v3.0 roadmap]: Phase 8 (SQLite) is prerequisite for Phase 10 (Insights); Phase 9 (Starred rules) is independent of Phase 8
- [v3.0 roadmap]: SQLite snapshot interval runs server-side, independent of browser — must survive container restarts by persisting the .db file via a Docker volume
- [Phase 08-sqlite-snapshot-infrastructure]: better-sqlite3 chosen for synchronous API — simpler background recorder with no async complexity
- [Phase 08-sqlite-snapshot-infrastructure]: purgeOldSnapshots() called inline after each insert — no separate cron needed
- [Phase 08-sqlite-snapshot-infrastructure]: instrumentation.ts uses dynamic import of recorder to avoid circular init issues at Next.js boot

### Pending Todos

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260418-ocd | Update README with comprehensive instructions for starting and testing the application | 2026-04-19 | 528fb15 | [260418-ocd-update-readme-with-comprehensive-instruc](./quick/260418-ocd-update-readme-with-comprehensive-instruc/) |
| 260419-ci0 | Write Vitest+RTL tests covering all 5 phase-04 UAT scenarios | 2026-04-19 | cde8211 | [260419-ci0-write-vitest-rtl-tests-covering-all-5-ph](./quick/260419-ci0-write-vitest-rtl-tests-covering-all-5-ph/) |
| 260420-dev | Create dev startup script with test passwords | 2026-04-20 | — | [260420-dev-startup-script-with-test-passwords](./quick/260420-dev-startup-script-with-test-passwords/) |
| 260423-moc | Add .env.vercel-mock + Vercel UAT mock mode instructions | 2026-04-23 | d79a0f2 | [260423-moc-mock-mode-vercel-uat-setup](./quick/260423-moc-mock-mode-vercel-uat-setup/) |
| 260423-las | Fix dashboard crash: lastSeen Date becomes ISO string after SWR revalidation | 2026-04-23 | 920efe9 | [260423-las-fix-dashboard-lastseen-date-crash](./quick/260423-las-fix-dashboard-lastseen-date-crash/) |
| 260424-262 | Fix UniFi API URLs to include consoleId in path | 2026-04-24 | 2f94bb2 | [260424-262-fix-unifi-api-urls-console-id](./quick/260424-262-fix-unifi-api-urls-console-id/) |
| 260425-pm2 | Add PM2 as a deployment option alongside Docker | 2026-04-25 | 085b28b | [260425-pm2-add-pm2-deployment-option](./quick/260425-pm2-add-pm2-deployment-option/) |
| 260516-srt | Update default sort order (API order) and status thresholds (idle/low/med/high) | 2026-05-16 | 7f34e3c | [260516-srt-update-sort-order-and-status-thresholds](./quick/260516-srt-update-sort-order-and-status-thresholds/) |
| 260517-jq1 | Fix rule-toggle SWR optimistic update shape mismatch (blank page on toggle) | 2026-05-17 | aaedcd5 | [260517-jq1-rule-toggle-swr-shape-fix](./quick/260517-jq1-rule-toggle-swr-shape-fix/) |
| 260517-0jr | Replace optimistic toggle update with disabled+pending state until API confirms | 2026-05-17 | 9e89790 | [260517-0jr-toggle-pending-state](./quick/260517-0jr-toggle-pending-state/) |

### Blockers/Concerns

None.

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-04-20 (v1.0):

| Category | Item | Status |
|----------|------|--------|
| uat_gap | Phase 04: 04-HUMAN-UAT.md | automated — human UAT replaced by Vitest+RTL automated tests |
| verification_gap | Phase 04: 04-VERIFICATION.md | human_needed — final human verification not performed |
| quick_task | 260418-ocd-update-readme-with-comprehensive-instruc | missing status file (task completed per STATE.md) |
| quick_task | 260419-ci0-write-vitest-rtl-tests-covering-all-5-ph | missing status file (task completed per STATE.md) |

## Session Continuity

Last session: 2026-05-17T00:09:00.000Z
Stopped at: Completed 09-starred-firewall-rules-01-PLAN.md
Resume file: None
