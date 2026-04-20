# Roadmap: Unifi Network Dashboard

## Milestones

- ✅ **v1.0 MVP** — Phases 1–4 (shipped 2026-04-19)
- **v1.1 Dev Mocking** — Phase 5 (current)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–4) — SHIPPED 2026-04-19</summary>

- [x] Phase 1: Foundation & Authentication (6/6 plans) — completed 2026-04-15
- [x] Phase 2: Dashboard & Traffic Monitoring (3/3 plans) — completed 2026-04-15
- [x] Phase 3: Firewall Control (4/4 plans) — completed 2026-04-18
- [x] Phase 4: Enhanced Features (3/3 plans) — completed 2026-04-19

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 Dev Mocking

- [ ] **Phase 5: Dev Mock Layer** — Full mock of UniFi client interface with realistic data for development without a real console

## Phase Details

### Phase 5: Dev Mock Layer
**Goal**: Developers can run the app locally without a real UniFi console and exercise all dashboard features with realistic mock data
**Depends on**: Nothing (additive layer on top of v1.0 codebase)
**Requirements**: MOCK-01, MOCK-02, MOCK-03, MOCK-04, MOCK-05, MOCK-06, MOCK-07, MOCK-08
**Success Criteria** (what must be TRUE):
  1. Running `./dev.sh` starts the app in mock mode — no real API calls are made and no UniFi credentials are required
  2. The dashboard displays at least 6 network clients with High, Medium, Low, and Idle traffic status badges, each with correct name, MAC, IP, and bytes-per-second values
  3. The firewall page displays at least 3 rules with varied names and mixed enabled/disabled states
  4. Toggling a firewall rule in the UI flips its enabled state and the change persists for the remainder of the dev session (survives page refresh, resets on server restart)
  5. Disabling UNIFI_MOCK (or running against production) uses the real UniFi client code with zero changes to client.ts exports
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Create mock.ts + index.ts facade, update API route imports and dev.sh
- [ ] 05-02-PLAN.md — Write mock unit tests and repair route test vi.mock targets

**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Authentication | v1.0 | 6/6 | Complete | 2026-04-15 |
| 2. Dashboard & Traffic Monitoring | v1.0 | 3/3 | Complete | 2026-04-15 |
| 3. Firewall Control | v1.0 | 4/4 | Complete | 2026-04-18 |
| 4. Enhanced Features | v1.0 | 3/3 | Complete | 2026-04-19 |
| 5. Dev Mock Layer | v1.1 | 0/2 | Not started | - |
