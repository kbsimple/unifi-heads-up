# Roadmap: Unifi Network Dashboard

## Milestones

- ✅ **v1.0 MVP** — Phases 1–4 (shipped 2026-04-19)
- ✅ **v1.1 Dev Mocking** — Phase 5 (shipped 2026-04-19)
- 🔄 **v2.0 Local Edition** — Phases 6–7 (in progress)
- 🔄 **v3.0 Statefulness & Insights** — Phases 8–10 (planning)

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

- [ ] **Phase 6: Local API Client** - Rewrite client.ts for direct LAN access and validate on real hardware
- [ ] **Phase 7: Docker Deployment** - Package app for self-hosted LAN deployment with Docker

### v3.0 Statefulness & Insights

- [ ] **Phase 8: SQLite Snapshot Infrastructure** - Record per-client bandwidth snapshots every 60s with 30-day retention, driven by a background server interval
- [ ] **Phase 9: Starred Firewall Rules** - Add server-side star preferences with star indicator and filter on the firewall rules page
- [ ] **Phase 10: Insights Page** - New page with ranked heaviest-traffic devices and per-device hourly heatmap, user-selectable 7/14/30d range

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
  - [ ] 08-01-PLAN.md — DB module, recorder singleton, instrumentation hook, and tests

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
  - [ ] 09-01-PLAN.md — SQLite db helper + starred API routes + star UI + filter toggle
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
  - [ ] 10-01-PLAN.md — Insights query module (Vitest-tested) + two authenticated API routes
  - [ ] 10-02-PLAN.md — Nav link + Insights page Server Component shell
  - [ ] 10-03-PLAN.md — InsightsShell, TopDevicesChart, DeviceActivityHeatmap + page wiring
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
| 8. SQLite Snapshot Infrastructure | v3.0 | 0/1 | Planning | - |
| 9. Starred Firewall Rules | v3.0 | 0/1 | Planning | - |
| 10. Insights Page | v3.0 | 0/3 | Planning | - |
