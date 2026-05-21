---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Local Edition
status: Gap closure needed — Clear Schedule DELETE body missing `enabled` field
stopped_at: context exhaustion at 90% (2026-05-21)
last_updated: "2026-05-21T06:36:44.014Z"
last_activity: "2026-05-17 — Phase 11 (Firewall Rule Scheduling) verification complete — gaps_found: Clear Schedule DELETE body missing enabled field"
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 6
  completed_plans: 6
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-24)

**Core value:** Visibility and control over home network traffic — users must be able to see which devices are actively using bandwidth and pause/resume internet access for specific devices or groups.
**Current focus:** v3.0 Statefulness & Insights — SQLite traffic history, starred firewall rules, and multi-day insights page

## Current Position

Phase: Phase 11 — Firewall Rule Scheduling
Plan: 11-02 (verification complete — gaps_found)
Status: Gap closure needed — Clear Schedule DELETE body missing `enabled` field
Last activity: 2026-05-17 — Phase 11 (Firewall Rule Scheduling) verification complete — gaps_found: Clear Schedule DELETE body missing enabled field

Progress: [██████████] 100% plans complete (gap closure pending)

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
| Phase 11-firewall-rule-scheduling P01 | 4 | 3 tasks | 6 files |
| Phase 11-firewall-rule-scheduling P02 | 2 | 3 tasks | 5 files |

## Accumulated Context

### Roadmap Evolution

- Phase 11 added: Firewall rule scheduling — temporary duration on enabled rules with auto-disable

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
- [Phase 11-firewall-rule-scheduling]: UnifiScheduleSchema uses z.union ALWAYS|ONE_TIME_ONLY with passthrough() on ALWAYS to preserve unknown fields
- [Phase 11-firewall-rule-scheduling]: POST /api/firewall/schedule always sets enabled=true alongside schedule (UX: scheduling implies enabling)
- [Phase 11-firewall-rule-scheduling]: DELETE /api/firewall/schedule GETs current policies to preserve existing enabled state before writing ALWAYS
- [Phase 11-firewall-rule-scheduling]: base-ui Popover has no asChild — PopoverTrigger renders natively as button; Clock icon placed directly inside trigger

### Pending Todos

None.

### Future Extensions

| Idea | Notes |
|------|-------|
| Per-client top apps (DPI) | `POST /proxy/network/api/s/default/stat/stadpi` with `{"type":"by_app","macs":[...]}` returns per-client app byte counts. Counters are cumulative — need snapshot delta (same pattern as bandwidth recorder). App names are numeric IDs decoded via `dynamic.dpi.js` lookup table from the controller. DPI must be enabled in UniFi Network settings. v1 API path only. |

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
| 260517-2ee | Fix login from other LAN machines — bind dev and start servers to 0.0.0.0 | 2026-05-17 | tbd | [260517-2ee-fix-lan-login](./quick/260517-2ee-fix-lan-login/) |
| 260517-y8v | Add server telemetry: Next.js instrumentation for server logging, client error boundary, and /api/statusz endpoint | 2026-05-17 | db7ed6d | [260517-y8v-server-telemetry](./quick/260517-y8v-server-telemetry/) |

### Blockers/Concerns

None — Phase 11 gap resolved: `enabled: policy.enabled` added to `handleClear` DELETE body (commit 5f79fbb) and RTL test D3 updated (commit 41b045f).

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-04-20 (v1.0):

| Category | Item | Status |
|----------|------|--------|
| uat_gap | Phase 04: 04-HUMAN-UAT.md | automated — human UAT replaced by Vitest+RTL automated tests |
| verification_gap | Phase 04: 04-VERIFICATION.md | human_needed — final human verification not performed |
| quick_task | 260418-ocd-update-readme-with-comprehensive-instruc | missing status file (task completed per STATE.md) |
| quick_task | 260419-ci0-write-vitest-rtl-tests-covering-all-5-ph | missing status file (task completed per STATE.md) |

## Session Log

### 2026-05-17 — Observability, Dashboard UX, and Insights polish

| # | Change | Commit |
|---|--------|--------|
| 1 | Server telemetry: `instrumentation.ts` startup logger, `/api/statusz` endpoint, React `ErrorBoundary` in root layout | bd32342, db7ed6d |
| 2 | Insights top-devices: show `displayName` (enriched from live UniFi clients) instead of raw MAC | 100da02 |
| 3 | Traffic thresholds lowered: medium 1–2 Mbps, high ≥2 Mbps (was 1–5 / ≥5) | 93be347 |
| 4 | Expired schedule badge text changed to "set a new duration to enable" | c524819 |
| 5 | Insights tooltip: shows active duration (e.g. "5.1GB · 3h 12m active") derived from snapshot count | caf4db7 |
| 6 | Insights tooltip contrast fixed: added `itemStyle` to force zinc-100 text | 2f026ef |
| 7 | Docker: `data/` mounted as named volume `unifi-data` for SQLite persistence across restarts | 222d1ca |
| 8 | Dashboard client rows: separate ↓/↑ rate columns + WiFi signal strength with colored dot indicator | 7892b4c |
| 9 | Dashboard active-only toggle: filters idle clients, reorders by status (high→medium→low) on each refresh | cfa399c |

Future extension recorded: per-client DPI top-apps via `POST /proxy/network/api/s/default/stat/stadpi`.

## Session Continuity

Last session: 2026-05-21T06:36:44.011Z
Stopped at: context exhaustion at 90% (2026-05-21)
Resume file: None
