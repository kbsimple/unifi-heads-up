# Requirements: Unifi Network Dashboard v1.1

**Defined:** 2026-04-20
**Milestone:** v1.1 Dev Mocking
**Core Value:** Make the app fully usable in dev without a real UniFi console

## v1.1 Requirements

Requirements for the Dev Mocking milestone. Each maps to a roadmap phase.

### Mock Infrastructure

- [ ] **MOCK-01**: When `UNIFI_MOCK=true`, the app uses mock data instead of calling `api.ui.com`
- [ ] **MOCK-02**: Real UniFi client code is unchanged — mock intercepts at the same function interface
- [ ] **MOCK-03**: `dev.sh` sets `UNIFI_MOCK=true` automatically

### Mock Firewall Rules

- [ ] **MOCK-04**: Mock returns a realistic set of firewall rules (≥3 rules with varied names and enabled states)
- [ ] **MOCK-05**: Toggling a mock rule updates its enabled state in-memory for the session

### Mock Network Clients

- [ ] **MOCK-06**: Mock returns a realistic set of network clients (≥6 clients)
- [ ] **MOCK-07**: Mock clients cover all four traffic statuses: High, Medium, Low, Idle
- [ ] **MOCK-08**: Mock client data includes name, MAC, IP, and bytes-per-second values consistent with each status

## Out of Scope

| Feature | Reason |
|---------|--------|
| Persisting mock state across restarts | In-memory is sufficient for dev iteration |
| Configuring mock data via UI | Dev-only concern, not user-facing |
| Mocking endpoints beyond clients + firewall | Only these two are used by the dashboard |
| MSW / service worker mocking | Overkill — server-side intercept is simpler |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MOCK-01 | Phase 5 | Pending |
| MOCK-02 | Phase 5 | Pending |
| MOCK-03 | Phase 5 | Pending |
| MOCK-04 | Phase 5 | Pending |
| MOCK-05 | Phase 5 | Pending |
| MOCK-06 | Phase 5 | Pending |
| MOCK-07 | Phase 5 | Pending |
| MOCK-08 | Phase 5 | Pending |

---
*Requirements defined: 2026-04-20*
