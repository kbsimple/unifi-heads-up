# Roadmap: Unifi Network Dashboard

## Milestones

- ✅ **v1.0 MVP** — Phases 1–4 (shipped 2026-04-19)
- ✅ **v1.1 Dev Mocking** — Phase 5 (shipped 2026-04-19)

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

## Planned: v2.0 Local Hosting + Real API Connectivity

**Problem:** The Ubiquiti cloud REST API (`api.ui.com`) does not expose connected client data or per-device bandwidth statistics. The official web app retrieves this data via WebRTC + MQTT, which is incompatible with Vercel serverless functions. See [docs/UNIFI-API-FINDINGS.md](../docs/UNIFI-API-FINDINGS.md) for full research findings.

**Solution:** Move hosting to a device on the home LAN (Raspberry Pi, NAS, or similar) with direct access to the UDR's local controller API. This unlocks:

- `POST /proxy/network/api/s/default/stat/report/5minutes.user` — per-device 5-minute bandwidth buckets (`rx_bytes`, `tx_bytes`) sufficient for high/medium/low/idle classification
- `GET /proxy/network/api/s/default/stat/sta` — real-time active client list with live traffic rates
- Full firewall policy control without cloud proxy limitations

**Proposed phases:**

| Phase | Description |
|-------|-------------|
| 6. Local Deployment | Dockerise the Next.js app; document deployment to a Raspberry Pi or NAS on the home LAN; replace `UNIFI_CONSOLE_ID` + cloud proxy URLs with local UDR IP + site name |
| 7. Real Client Data | Replace mock/cloud client fetching with `stat/report/5minutes.user` and `stat/sta`; restore per-device traffic classification (high/medium/low/idle) |
| 8. Firewall via Local API | Wire firewall toggle to local controller API (`/proxy/network/api/s/default/rest/firewallrule`) for lower latency and no cloud dependency |

**Decision gate:** Confirm local hosting target (device, OS, Docker availability) before starting Phase 6.

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Authentication | v1.0 | 6/6 | Complete | 2026-04-15 |
| 2. Dashboard & Traffic Monitoring | v1.0 | 3/3 | Complete | 2026-04-15 |
| 3. Firewall Control | v1.0 | 4/4 | Complete | 2026-04-18 |
| 4. Enhanced Features | v1.0 | 3/3 | Complete | 2026-04-19 |
| 5. Dev Mock Layer | v1.1 | 2/2 | Complete | 2026-04-19 |
