# Roadmap: Unifi Network Dashboard

## Milestones

- ✅ **v1.0 MVP** — Phases 1–4 (shipped 2026-04-19)
- ✅ **v1.1 Dev Mocking** — Phase 5 (shipped 2026-04-19)
- 🔄 **v2.0 Local Edition** — Phases 6–7 (in progress)

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
  - [ ] 06-02-PLAN.md — Rewrite src/lib/unifi/client.ts using undici.fetch + scoped Agent
  - [ ] 06-03-PLAN.md — Phase verification gate (full suite + human UAT for live hardware)
**UI hint**: yes

### Phase 7: Docker Deployment
**Goal**: The app runs as a self-hosted container on the local network with documented setup
**Depends on**: Phase 6
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05
**Success Criteria** (what must be TRUE):
  1. `next build` completes with `output: 'standalone'` and the `.next/standalone` directory is present
  2. `docker build` produces a runnable image and `docker run` starts the app responding on the expected port
  3. `docker-compose up -d` starts the container; stopping and rebooting the host brings it back automatically
  4. The built Docker image contains no secrets — `UNIFI_HOST`, `UNIFI_API_KEY`, and `AUTH_SECRET` are injected at runtime via an env file
  5. A household member with no prior context can follow the written setup instructions and reach the running app on the LAN
**Plans**: 3 plans
  - [ ] 06-01-PLAN.md — Wave 0 test mock swap (ky → undici) + env var update + .env.local.example
  - [ ] 06-02-PLAN.md — Rewrite src/lib/unifi/client.ts using undici.fetch + scoped Agent
  - [ ] 06-03-PLAN.md — Phase verification gate (full suite + human UAT for live hardware)

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Authentication | v1.0 | 6/6 | Complete | 2026-04-15 |
| 2. Dashboard & Traffic Monitoring | v1.0 | 3/3 | Complete | 2026-04-15 |
| 3. Firewall Control | v1.0 | 4/4 | Complete | 2026-04-18 |
| 4. Enhanced Features | v1.0 | 3/3 | Complete | 2026-04-19 |
| 5. Dev Mock Layer | v1.1 | 2/2 | Complete | 2026-04-19 |
| 6. Local API Client | v2.0 | 1/3 | In Progress|  |
| 7. Docker Deployment | v2.0 | 0/? | Not started | - |
