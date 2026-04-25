# Requirements: UniFi Network Dashboard

**Defined:** 2026-04-24
**Core Value:** Visibility and control over home network traffic — users must be able to see which devices are actively using bandwidth and pause/resume internet access for specific devices or groups.

---

## Validated Requirements (v1.0 + v1.1)

- ✓ **AUTH-01**: User can authenticate to access the dashboard — v1.0 (Phase 1)
- ✓ **DASH-01**: User can view real-time traffic status (high/medium/low/idle) for all network clients — v1.0 (Phase 2)
- ✓ **FW-01**: User can toggle (enable/disable) pre-existing firewall rules — v1.0 (Phase 3)
- ✓ **GRP-01**: User can view traffic status for configured device groups — v1.0 (Phase 4)
- ✓ **MOCK-01**: `UNIFI_MOCK=true` activates mock data layer; app runs in dev without real UniFi console — v1.1 (Phase 5)
- ✓ **MOCK-02**: Real UniFi client code is unchanged — mock intercepts at the same function interface — v1.1 (Phase 5)
- ✓ **MOCK-03**: `dev.sh` sets `UNIFI_MOCK=true` automatically — v1.1 (Phase 5)
- ✓ **MOCK-04**: Mock returns ≥3 firewall rules with varied names and mixed enabled states; toggle persists in-memory — v1.1 (Phase 5)
- ✓ **MOCK-05**: Mock returns ≥6 network clients covering High/Medium/Low/Idle statuses — v1.1 (Phase 5)

---

## v2.0 Requirements — Local Edition

### API Client

- [ ] **LOCAL-01**: App authenticates with the UniFi console via `X-API-KEY` header over a direct LAN HTTPS connection (no cloud proxy)
- [ ] **LOCAL-02**: App handles the console's self-signed TLS certificate via a scoped `undici` Agent with `rejectUnauthorized: false` — not a global `NODE_TLS_REJECT_UNAUTHORIZED=0` bypass
- [ ] **LOCAL-03**: Traffic status dashboard displays real client data from the local API (High/Medium/Low/Idle badges, 24h history, device groups all functional)
- [ ] **LOCAL-04**: Firewall rule toggles persist on the console — confirmed via UniFi UI, not just API response
- [ ] **LOCAL-05**: `UNIFI_MOCK=true` mock layer remains functional for local development

### Deployment

- [ ] **DEPLOY-01**: Next.js app builds with `output: 'standalone'` in `next.config.ts`
- [ ] **DEPLOY-02**: Multi-stage `Dockerfile` (Node 22 Alpine, builder + runner stages) produces a runnable image
- [ ] **DEPLOY-03**: `docker-compose.yml` with `restart: unless-stopped` and `env_file` support for always-on LAN hosting
- [ ] **DEPLOY-04**: All sensitive config (`UNIFI_HOST`, `UNIFI_API_KEY`, `AUTH_SECRET`) passed at container runtime — not baked into the image at build time
- [ ] **DEPLOY-05**: Setup documented: how to build the image, start with docker-compose, required env vars, and how to reach the app on the LAN

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Running on Dream Machine Pro directly | UniFi OS 3.x/4.x removed Docker; unofficial nspawn workaround breaks on firmware upgrades and risks network stability |
| New dashboard features beyond v1.x parity | v2.0 is a connectivity migration — feature additions deferred to v2.1+ |
| DPI stats, per-client blocking, richer local API data | Not validated as needed; deferred |
| Removing app auth | JWT login kept — LAN-only doesn't require removing auth |
| Global TLS bypass (`NODE_TLS_REJECT_UNAUTHORIZED=0`) | Disables TLS for entire process; scoped undici Agent is the correct approach |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| DASH-01 | Phase 2 | Complete |
| FW-01 | Phase 3 | Complete |
| GRP-01 | Phase 4 | Complete |
| MOCK-01 | Phase 5 | Complete |
| MOCK-02 | Phase 5 | Complete |
| MOCK-03 | Phase 5 | Complete |
| MOCK-04 | Phase 5 | Complete |
| MOCK-05 | Phase 5 | Complete |
| LOCAL-01 | Phase 6 | Pending |
| LOCAL-02 | Phase 6 | Pending |
| LOCAL-03 | Phase 6 | Pending |
| LOCAL-04 | Phase 6 | Pending |
| LOCAL-05 | Phase 6 | Pending |
| DEPLOY-01 | Phase 7 | Pending |
| DEPLOY-02 | Phase 7 | Pending |
| DEPLOY-03 | Phase 7 | Pending |
| DEPLOY-04 | Phase 7 | Pending |
| DEPLOY-05 | Phase 7 | Pending |

**Coverage:**
- v2.0 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-24*
*Last updated: 2026-04-24 — traceability updated after v2.0 roadmap creation*
