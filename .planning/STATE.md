---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Streamlining Management UX Flows
status: in_progress
stopped_at: ""
last_updated: "2026-07-18T21:00:00Z"
last_activity: "2026-07-18 - Firewall rules visibility fixed; inline schedule picker added"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-18)

**Core value:** Visibility and control over home network traffic — users must be able to see which devices are actively using bandwidth and pause/resume internet access for specific devices.
**Current focus:** v5.0 — Streamlining Management UX Flows

## Current Position

Phase: Phase 13 — Schema Extension & Mock Update (not started)
Plan: —
Status: Roadmap created, ready to begin Phase 13
Last activity: 2026-07-18 — v5.0 roadmap created (5 phases: 13–17)

Progress: [░░░░░░░░░░] 0% — 0/5 phases complete

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
| Phase 12-e2e-tests P01 | 5 | 2 tasks | 6 files |
| Phase 12-e2e-tests P02 | 9 | 2 tasks | 5 files |

## Accumulated Context

### Roadmap Evolution

- Phase 11 added: Firewall rule scheduling — temporary duration on enabled rules with auto-disable
- Phase 12 added: End-to-end tests — real Next.js server + mock UniFi API + browser-level assertions (Playwright)
- Phases 13–17 added: v5.0 Streamlining Management UX Flows — schema/mock, statusz page, mapping logic, device-rules API, inline toggle UI
- Phase 18 added: Per-Client App Visibility (DPI) — show top apps per device in expanded row using UniFi DPI data

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
- [Phase 12-e2e-tests P01]: baseURL placed in use object not top-level — TypeScript PlaywrightTestConfig requires it inside use{}
- [Phase 12-e2e-tests P01]: ADMIN_PASSWORD uses bcrypt hash in playwright.config.ts — NODE_ENV=production server rejects DEV_ADMIN_PASSWORD plaintext fallback
- [Phase 12-e2e-tests P01]: Port 3001 for E2E webServer — avoids collision with dev server on 3000
- [Phase 12-e2e-tests P02]: output: standalone incompatible with next start — use node .next/standalone/server.js with static asset copy step
- [Phase 12-e2e-tests P02]: playwright.config.ts uses cwd: projectRoot (__dirname/../) — Playwright resolves webServer paths from config file directory, not project root
- [Phase 12-e2e-tests P02]: setup project needs explicit testDir: ./fixtures — auth.setup.ts is outside global testDir ./tests
- [Phase 12-e2e-tests P02]: unauthenticated browser.newContext() must pass { storageState: { cookies: [], origins: [] } } — project storageState is inherited otherwise
- [Phase 12-e2e-tests P02]: dashboard table selectors: getByRole('cell') for client names — card view hidden at default viewport; getByRole('table').locator('[data-slot=badge]') for badges
- [v5.0 roadmap]: Phase 13 (schema + mock) must precede Phase 15 (mapping logic) — mock must have ZBF MAC fields or unit tests are vacuously passing
- [v5.0 roadmap]: Phase 16 (device-rules route) is a composition layer between mapping logic and UI — testable in mock mode before UI is built
- [v5.0 roadmap]: MAPP-F01 (IP group resolution) deferred to future requirements — unverified API endpoint, HIGH complexity
- [v5.0 roadmap]: ZBF field names (source.client_macs / destination.client_macs) need live-console verification before finalizing Phase 15

### Pending Todos

None.

### Future Extensions

| Idea | Notes |
|------|-------|
| Per-client top apps (DPI) | **Status: BLOCKED — stadpi non-functional on firmware 9.x.** Live hardware test (2026-07-18) confirmed `stat/stadpi` returns `{"meta":{"rc":"ok"},"data":[]}` for all MACs including actively-trafficked devices. The v1 API path appears deprecated or non-populated by UniFi OS/Network 9.x. **Next step:** intercept network calls made by the UniFi web UI's Traffic tab for a client to discover the current DPI endpoint (likely a v2 path). Probe tool is in place at `/dpi-probe` for re-testing once the correct endpoint is found. **App ID decode:** `src/lib/dpi/cat_app.json` + `decodeAppId()` are already built and tested. **Remaining work once endpoint confirmed:** periodic snapshot recorder, `dpi_snapshots` SQLite table, delta math, expanded-row "Top Apps" UI. |
| IP group membership matching (MAPP-F01) | Resolve IP group IDs to member IPs and check containment. Requires unverified `/firewall-address-groups` API endpoint. HIGH complexity; deferred pending live-hardware verification. |

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
| 260604-rg1 | Remove groups feature entirely from the app | 2026-06-04 | fda4a2b | [260604-rg1-remove-groups-feature](./quick/260604-rg1-remove-groups-feature/) |
| 260604-tf1 | Fix all 28 failing tests — update stale expectations to match current source | 2026-06-04 | 0ee37e4 | [260604-tf1-fix-failing-tests](./quick/260604-tf1-fix-failing-tests/) |
| 260607-instant | Instant dashboard load via SQLite client cache with stale-while-revalidate | 2026-06-07 | 7708fec | [260607-instant-cache](./quick/260607-instant-cache/) |
| 260609-3e2 | Smooth dashboard traffic status with rolling snapshot average (SNAPSHOT_WINDOW=2) | 2026-06-09 | 31135f8 | [260609-3e2-snapshot-avg-traffic-status](./quick/260609-3e2-snapshot-avg-traffic-status/) |
| 260610-icb | Fix insights tab bar chart click overlay (Recharts cursor/activeBar) | 2026-06-10 | 21d36c0 | [260610-icb-insights-bar-click-overlay](./quick/260610-icb-insights-bar-click-overlay/) |
| 260610-dad | Fix Device Activity dropdown to show client display names instead of MAC addresses | 2026-06-10 | c255727 | [260610-dad-device-activity-display-names](./quick/260610-dad-device-activity-display-names/) |
| 260717-dab | Fix dashboard rx/tx swap and seed Last Busy from DB snapshots | 2026-07-17 | cd12916 | [260717-dab-dashboard-activity-bugs](./quick/260717-dab-dashboard-activity-bugs/) |
| 260717-rgt | Add regression tests for dashboard rx/tx swap and DB-backed lastBusy fixes | 2026-07-17 | bd53de4 | [260717-rgt-dashboard-bug-regression-tests](./quick/260717-rgt-dashboard-bug-regression-tests/) |
| 260717-lbr | Fix Last Busy column not refreshing on page load | 2026-07-17 | b15c698 | [260717-lbr-last-busy-refresh](./quick/260717-lbr-last-busy-refresh/) |
| 260717-trs | Add discrete time-range selector to site and per-device traffic charts | 2026-07-17 | 8e48aed | [260717-trs-time-range-selector](./quick/260717-trs-time-range-selector/) |
| 20260718-ifw | Add schedule picker (2h/6h/24h) to inline firewall rules in dashboard device rows | 2026-07-18 | 2f8d6bb | [20260718-ifw-inline-firewall-schedule](./quick/20260718-ifw-inline-firewall-schedule/) |

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

Items acknowledged and deferred at milestone close on 2026-06-11 (v4.0):

| Category | Item | Status |
|----------|------|--------|
| uat_gap | Phase 06: 06-HUMAN-UAT.md | partial — live-hardware UAT requires physical UniFi console (deferred since v2.0) |
| uat_gap | Phase 07: 07-HUMAN-UAT.md | unknown — Docker UAT requires LAN hardware (deferred since v2.0) |
| verification_gap | Phase 06: 06-VERIFICATION.md | human_needed — live hardware verification pending |
| verification_gap | Phase 07: 07-VERIFICATION.md | human_needed — live Docker deployment verification pending |
| quick_task | 260423-las-fix-dashboard-lastseen-date-crash | missing status file (task completed per STATE.md) |
| quick_task | 260423-moc-mock-mode-vercel-uat-setup | missing status file (task completed per STATE.md) |
| quick_task | 260424-262-fix-unifi-api-urls-console-id | missing status file (task completed per STATE.md) |
| quick_task | 260425-pm2-add-pm2-deployment-option | missing status file (task completed per STATE.md) |
| quick_task | 260516-srt-update-sort-order-and-status-thresholds | missing status file (task completed per STATE.md) |
| quick_task | 260517-0jr-toggle-pending-state | missing status file (task completed per STATE.md) |
| quick_task | 260517-2ee-fix-lan-login | missing status file (task completed per STATE.md) |
| quick_task | 260517-jq1-rule-toggle-swr-shape-fix | missing status file (task completed per STATE.md) |
| quick_task | 260517-y8v-server-telemetry | missing status file (task completed per STATE.md) |
| quick_task | 260604-rg1-remove-groups-feature | missing status file (task completed per STATE.md) |
| quick_task | 260604-tf1-fix-failing-tests | missing status file (task completed per STATE.md) |
| quick_task | 260607-instant-cache | missing status file (task completed per STATE.md) |
| quick_task | 260607-mbps-conversion-fix | missing status file (task completed per STATE.md) |
| quick_task | 260609-3e2-snapshot-avg-traffic-status | missing status file (task completed per STATE.md) |
| quick_task | 260610-dad-device-activity-display-names | missing status file (task completed per STATE.md) |
| quick_task | 260610-icb-insights-bar-click-overlay | missing status file (task completed per STATE.md) |
| todo | 2026-05-17-add-statusz-page.md | resolved — /statusz page scoped to Phase 14 of v5.0 roadmap |

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

### 2026-07-18 — v5.0 milestone start + firewall rules debugging + inline schedule picker

| # | Change | Commit |
|---|--------|--------|
| 1 | v5.0 requirements defined: 11 requirements across MAPP, FWUX, HLTH categories | — |
| 2 | v5.0 roadmap created: Phases 13–17 mapped to all 11 requirements | — |
| 3 | Fix invisible firewall rules: `isZoneBasedFirewallEnabled()` now returns false gracefully on non-OK response instead of throwing; `InlineFirewallRules` SWR fetcher now throws on non-OK so error state renders ShieldOff correctly | 0ec56fb |
| 4 | Add firewall diagnostic section to `/statusz`: shows ZBF/legacy mode, policy count, ZBF vs legacy policy counts | 240c179 |
| 5 | Fix device-rules matching: `getRulesForDevice` now tries both ZBF (`source.client_macs`) and legacy (`srcMac`) fields in a single pass, eliminating dependency on unreliable feature-flag endpoint | be0a1b8 |
| 6 | Remove stale ZBF/legacy mismatch warning from statusz (no longer actionable after matching fix) | 7aca72d |
| 7 | Add inline schedule picker: 2h/6h/24h clock popover + expiry badge on inline firewall rules in dashboard device expanded row | 2f8d6bb |

## Session Continuity

Last session: 2026-07-18T21:00:00Z
Stopped at: Firewall rules visibility fixed; inline schedule picker shipped — Phases 13–17 still not started
Resume file: None
