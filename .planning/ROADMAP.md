# Roadmap: Unifi Network Dashboard

## Milestones

- ✅ **v1.0 MVP** — Phases 1–4 (shipped 2026-04-19)
- ✅ **v1.1 Dev Mocking** — Phase 5 (shipped 2026-04-19)
- ✅ **v2.0 Local Edition** — Phases 6–7 (shipped 2026-04-24)
- ✅ **v3.0 Statefulness & Insights** — Phases 8–11 (shipped 2026-05-17)
- ✅ **v4.0 Quality & Testing** — Phase 12 (shipped 2026-06-11)
- **v5.0 Streamlining Management UX Flows** — Phases 13–17 (active)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–4) — SHIPPED 2026-04-19</summary>

- [x] Phase 1: Foundation & Authentication (6/6 plans) — completed 2026-04-15
- [x] Phase 2: Dashboard & Traffic Monitoring (3/3 plans) — completed 2026-04-15
- [x] Phase 3: Firewall Control (4/4 plans) — completed 2026-04-18
- [x] Phase 4: Enhanced Features (3/3 plans) — completed 2026-04-19

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Dev Mocking (Phase 5) — SHIPPED 2026-04-19</summary>

- [x] Phase 5: Dev Mock Layer (2/2 plans) — completed 2026-04-19

Full archive: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### v2.0 Local Edition

- [x] **Phase 6: Local API Client** - Rewrite client.ts for direct LAN access and validate on real hardware
- [x] **Phase 7: Docker Deployment** - Package app for self-hosted LAN deployment with Docker

### v3.0 Statefulness & Insights

- [x] **Phase 8: SQLite Snapshot Infrastructure** - Record per-client bandwidth snapshots every 60s with 30-day retention, driven by a background server interval
- [x] **Phase 9: Starred Firewall Rules** - Add server-side star preferences with star indicator and filter on the firewall rules page
- [x] **Phase 10: Insights Page** - New page with ranked heaviest-traffic devices and per-device hourly heatmap, user-selectable 7/14/30d range

<details>
<summary>✅ v4.0 Quality & Testing (Phase 12) — SHIPPED 2026-06-11</summary>

- [x] Phase 12: End-to-End Tests (2/2 plans) — completed 2026-06-11

Full archive: `.planning/milestones/v4.0-ROADMAP.md`

</details>

### v5.0 Streamlining Management UX Flows

- [ ] **Phase 13: Schema Extension & Mock Update** - Extend UniFi schema and mock data with ZBF MAC fields so mapping logic has realistic test fixtures
- [ ] **Phase 14: /statusz Page** - Enhance the /api/statusz endpoint and add a /statusz UI page showing DB health, UniFi proxy reachability, and app version
- [ ] **Phase 15: Mapping Logic** - Implement mapping.ts to determine which firewall rules apply to a device by MAC/IP using ZBF or legacy mode
- [ ] **Phase 16: Device Rules API Route** - Add GET /api/firewall/device-rules route that composes the mapping layer and returns applicable rules for a device
- [ ] **Phase 17: Inline Toggle UI** - Add inline firewall rule list with toggles to the expanded device row in the dashboard

---

## Phase Details

### Phase 6: Local API Client
**Goal**: The app communicates directly with the UniFi console over LAN and all features deliver real data
**Depends on**: Phase 5 (mock layer remains intact as fallback)
**Requirements**: LOCAL-01, LOCAL-02, LOCAL-03, LOCAL-04, LOCAL-05
**Success Criteria** (what must be TRUE):
  1. App authenticates to the local UniFi console using `X-API-KEY` — no cloud proxy involved, confirmed by a successful API response from the console LAN IP
  2. The scoped `undici` Agent handles the console's self-signed TLS certificate without affecting any other HTTPS requests made by the app
  3. Traffic status dashboard shows real device data (High/Medium/Low/Idle badges, 24h history, device groups) sourced from the live local console
  4. A firewall rule toggled in the app is reflected as changed in the UniFi OS admin UI — confirmed by visual inspection, not just the API response
  5. Running with `UNIFI_MOCK=true` still produces mock data — the local dev workflow is unchanged from v1.1
**Plans**: 3 plans
  - [x] 06-01-PLAN.md — Wave 0 test mock swap (ky → undici) + env var update + .env.local.example
  - [x] 06-02-PLAN.md — Rewrite src/lib/unifi/client.ts using undici.fetch + scoped Agent
  - [x] 06-03-PLAN.md — Phase verification gate (full suite + human UAT for live hardware)
**UI hint**: yes

### Phase 7: Docker Deployment
**Goal**: The app runs as a self-hosted container on the local network with documented setup
**Depends on**: Phase 6
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05
**Success Criteria** (what must be TRUE):
  1. `next build` completes with `output: 'standalone'` and the `.next/standalone` directory is present
  2. `docker build` produces a runnable image and `docker run` starts the app responding on the expected port
  3. `docker compose up -d` starts the container; stopping and rebooting the host brings it back automatically
  4. The built Docker image contains no secrets — `UNIFI_HOST`, `UNIFI_API_KEY`, and `SESSION_SECRET` are injected at runtime via an env file
  5. A household member with no prior context can follow the written setup instructions and reach the running app on the LAN
**Plans**: 3 plans
  - [x] 07-01-PLAN.md — next.config.ts standalone + health endpoint + .gitignore exception
  - [x] 07-02-PLAN.md — Dockerfile, docker-compose.yml, .dockerignore, .env.prod.example
  - [x] 07-03-PLAN.md — README Self-Hosted/Docker section + 07-HUMAN-UAT.md

### Phase 8: SQLite Snapshot Infrastructure
**Goal**: The server continuously records per-client bandwidth into SQLite, independent of any browser session, with automatic 30-day cleanup
**Depends on**: Phase 7
**Requirements**: STA-01, STA-02, STA-03, STA-04
**Success Criteria** (what must be TRUE):
  1. After 2 minutes of server uptime with no browser open, the SQLite database contains at least 2 snapshot rows per active client
  2. Each snapshot row stores download and upload bytes/s, client identifier, and a timestamp
  3. Rows older than 30 days are absent from the database — the purge runs automatically without manual intervention
  4. Stopping and restarting the server does not lose previously recorded rows — data persists on disk
**Plans**: 1 plan
  - [x] 08-01-PLAN.md — DB module, recorder singleton, instrumentation hook, and tests

### Phase 9: Starred Firewall Rules
**Goal**: Users can mark firewall rules as favourites from any device, and filter the list to starred rules only
**Depends on**: Phase 7
**Requirements**: STAR-01, STAR-02, STAR-03, STAR-04
**Success Criteria** (what must be TRUE):
  1. Clicking the star on a firewall rule toggles its starred state and the change is immediately visible without a page refresh
  2. Opening the app in a different browser or device shows the same star state for each rule — preferences are not tied to a single browser
  3. Every starred rule displays a filled star indicator in the full firewall rules list
  4. Activating the "starred only" filter hides all unstarred rules; deactivating it restores the full list
**Plans**: 1 plan
  - [x] 09-01-PLAN.md — SQLite db helper + starred API routes + star UI + filter toggle
**UI hint**: yes

### Phase 10: Insights Page
**Goal**: Users can explore which devices consume the most bandwidth and when they are typically active, over a user-chosen time window
**Depends on**: Phase 8
**Requirements**: INS-01, INS-02, INS-03, INS-04
**Success Criteria** (what must be TRUE):
  1. The Insights page is reachable from the main navigation and loads without error
  2. The ranked device list shows devices ordered from highest to lowest total traffic for the selected period
  3. Selecting a device reveals an hourly heatmap showing which hours of the day it is typically active over the chosen window
  4. Switching between 7-day, 14-day, and 30-day selectors updates both the ranked list and the heatmap without a full page reload
**Plans**: 3 plans
  - [x] 10-01-PLAN.md — Insights query module (Vitest-tested) + two authenticated API routes
  - [x] 10-02-PLAN.md — Nav link + Insights page Server Component shell
  - [x] 10-03-PLAN.md — InsightsShell, TopDevicesChart, DeviceActivityHeatmap + page wiring
**UI hint**: yes

---

### Phase 11: Firewall Rule Scheduling
**Goal**: Users can set a temporary duration on an enabled firewall rule (e.g. "active for next 6 hours"), after which the rule is automatically disabled
**Depends on**: Phase 3
**Requirements**: SCHED-01, SCHED-02, SCHED-03
**Success Criteria** (what must be TRUE):
  1. A duration picker (presets: 2h / 6h / 24h) is accessible from each firewall rule card
  2. Selecting a duration enables the rule and schedules automatic disabling after the chosen period
  3. Rules with active schedules display a countdown or expiry indicator
  4. The schedule survives a server restart (persisted, not in-memory)
**Plans**: 2 plans
  - [x] 11-01-PLAN.md — Extend types, client, mock, and API routes for native UniFi schedule field
  - [x] 11-02-PLAN.md — SchedulePicker + ScheduleBadge components + FirewallCard integration
**UI hint**: yes

### Phase 12: End-to-End Tests
**Goal**: Critical user flows are verified by automated tests that run a real Next.js server and a mock UniFi API, giving confidence that the full stack works together before each Docker deploy
**Depends on**: Phase 7 (Docker/server setup) and Phase 11 (all features complete)
**Plans**: 2 plans
  - [x] 12-01-PLAN.md — Playwright setup + mock UniFi API server + auth flow tests
  - [x] 12-02-PLAN.md — Dashboard, Firewall, and Insights flow tests

---

### Phase 13: Schema Extension & Mock Update
**Goal**: The UniFi firewall policy schema and mock data include ZBF MAC address fields, giving mapping logic realistic test fixtures to validate against
**Depends on**: Phase 12
**Requirements**: (infrastructure — prerequisite for Phase 15)
**Success Criteria** (what must be TRUE):
  1. The `FirewallPolicy` Zod schema accepts `source.client_macs` and `destination.client_macs` arrays from ZBF responses without validation errors
  2. Mock firewall policies include at least one ZBF policy with `source.client_macs` and one legacy policy with `srcMac`, covering both matching paths
  3. All existing unit tests and E2E tests pass unchanged — schema extension is backward-compatible
**Plans**: TBD

### Phase 14: /statusz Page
**Goal**: Users and operators can view the app health status at /statusz without logging in — DB connectivity, UniFi proxy reachability, and app version at a glance
**Depends on**: Phase 12
**Requirements**: HLTH-01, HLTH-02, HLTH-03, HLTH-04
**Success Criteria** (what must be TRUE):
  1. `GET /api/statusz` returns a JSON body containing DB ping latency (ms) and a pass/fail indicator for the `SELECT 1` health check
  2. `GET /api/statusz` returns a UniFi proxy reachability result using the scoped `undici` Agent — no TLS errors from the self-signed console cert
  3. `GET /api/statusz` returns `version` and `releaseDate` read from `package.json`
  4. The `/statusz` page is accessible without authentication and displays colored indicators (green/red) for DB health, UniFi proxy, app version, and release date
**Plans**: TBD
**UI hint**: yes

### Phase 15: Mapping Logic
**Goal**: The app correctly determines which firewall rules apply to a specific device, using ZBF MAC matching or legacy IP/MAC matching based on the active firewall mode — with unit tests that flag if live-console ZBF field names need adjustment
**Depends on**: Phase 13 (schema + mock with ZBF fields)
**Requirements**: MAPP-01, MAPP-02, MAPP-03
**Success Criteria** (what must be TRUE):
  1. Given a device MAC address, `getRulesForDevice()` returns the firewall policies whose `source.client_macs` or `destination.client_macs` contain that MAC (ZBF mode)
  2. Given a device IP address, `getRulesForDevice()` returns the policies whose `srcAddress` matches that IP (legacy mode only)
  3. The mapping path (ZBF vs legacy) is selected once at module init via `isZoneBasedFirewallEnabled()` — not re-evaluated per request
  4. Unit tests cover both ZBF and legacy matching paths using mock policies; a test comment flags that ZBF field names need live-console verification before production use
**Plans**: TBD

### Phase 16: Device Rules API Route
**Goal**: A server-side API route composes the mapping layer and returns applicable firewall rules for a given device, testable in mock mode
**Depends on**: Phase 15 (mapping logic)
**Requirements**: (infrastructure — enables Phase 17)
**Success Criteria** (what must be TRUE):
  1. `GET /api/firewall/device-rules?mac={mac}` returns a JSON array of matching firewall policies (id, name, enabled) for the given MAC address
  2. The route returns an empty array (not an error) when no rules match the device
  3. The route works in `UNIFI_MOCK=true` mode — existing mock policies with MAC fields are returned as expected
  4. Unit tests for the route pass with mock data covering both match and no-match cases
**Plans**: TBD

### Phase 17: Inline Toggle UI
**Goal**: Users can see and toggle applicable firewall rules directly from the expanded device row in the dashboard, without navigating to the Firewall page
**Depends on**: Phase 16 (device rules API route)
**Requirements**: FWUX-01, FWUX-02, FWUX-03, FWUX-04
**Success Criteria** (what must be TRUE):
  1. Expanding a device row that has matching firewall rules shows a compact list of those rules with name and an enabled/disabled toggle
  2. Clicking a toggle in the expanded row enables or disables the rule — the change is confirmed by the API and reflected immediately
  3. After toggling a rule from the expanded row, the Firewall page shows the same updated state without a page reload (shared SWR cache)
  4. Expanding a device row with no matching rules shows a small indicator icon; hovering or tapping it displays "No firewall rules apply to this device"
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Authentication | v1.0 | 6/6 | Complete | 2026-04-15 |
| 2. Dashboard & Traffic Monitoring | v1.0 | 3/3 | Complete | 2026-04-15 |
| 3. Firewall Control | v1.0 | 4/4 | Complete | 2026-04-18 |
| 4. Enhanced Features | v1.0 | 3/3 | Complete | 2026-04-19 |
| 5. Dev Mock Layer | v1.1 | 2/2 | Complete | 2026-04-19 |
| 6. Local API Client | v2.0 | 3/3 | Complete (live-hw UAT deferred) | 2026-04-24 |
| 7. Docker Deployment | v2.0 | 3/3 | Complete (live-Docker UAT deferred) | 2026-04-24 |
| 8. SQLite Snapshot Infrastructure | v3.0 | 1/1 | Complete | 2026-05-17 |
| 9. Starred Firewall Rules | v3.0 | 1/1 | Complete (human UAT deferred) | 2026-05-17 |
| 10. Insights Page | v3.0 | 3/3 | Complete | 2026-05-17 |
| 11. Firewall Rule Scheduling | v3.0 | 2/2 | Complete | 2026-05-17 |
| 12. End-to-End Tests | v4.0 | 2/2 | Complete | 2026-06-11 |
| 13. Schema Extension & Mock Update | v5.0 | 0/? | Not started | - |
| 14. /statusz Page | v5.0 | 0/? | Not started | - |
| 15. Mapping Logic | v5.0 | 0/? | Not started | - |
| 16. Device Rules API Route | v5.0 | 0/? | Not started | - |
| 17. Inline Toggle UI | v5.0 | 0/? | Not started | - |
