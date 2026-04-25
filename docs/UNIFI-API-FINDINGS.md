# UniFi API Research Findings

## Summary

The official UniFi cloud REST API (`api.ui.com`) does **not** expose connected client data with bandwidth statistics. The official web app (`unifi.ui.com`) retrieves client data via WebRTC + MQTT, not HTTP REST. This has significant implications for any cloud-only integration.

---

## What the REST API Actually Provides

Base URL: `https://api.ui.com`  
Auth: `X-API-KEY` header

| Endpoint | Returns |
|----------|---------|
| `GET /ea/hosts` | List of consoles |
| `GET /ea/hosts/{hostId}` | Single console |
| `GET /ea/devices?hostIds[]={hostId}` | Infrastructure devices (APs, switches, gateway) |
| `GET /ea/sites` | Sites with aggregate statistics |
| `GET /v1/hosts` | Same as `/ea/hosts` |
| `GET /v1/devices?hostIds[]={hostId}` | Same as `/ea/devices` |
| `GET /v1/sites` | Same as `/ea/sites` |

The `/ea/sites` response includes useful aggregate stats per site: total client counts (`wifiClient`, `wiredClient`), WAN uptime percentage, ISP info, and WAN IP — but **no per-device data or bandwidth rates**.

There is no REST endpoint for connected clients. The [Art-of-WiFi UniFi Cloud API client](https://github.com/Art-of-WiFi/UniFi-Cloud-API-client) — the authoritative open-source reference — implements exactly three services (hosts, sites, devices) and has no clients service.

---

## How the Official Web App Gets Client Data

Observed via HAR capture of `unifi.ui.com`:

1. `POST cloudaccess.svc.ui.com/create-credentials` — exchanges session cookie for temporary AWS IAM credentials
2. `GET cloudaccess.svc.ui.com/api/v1/hosts` — retrieves host metadata (authenticated with `x-amz-security-token`)
3. WebRTC tunnel + MQTT over WebSocket to AWS IoT (`*.iot.us-west-2.amazonaws.com/mqtt`) — real-time client data streams through this tunnel, not via HTTP

The web app never calls `api.ui.com` for client data. The REST API is a separate, limited interface designed for management automation.

---

## Key IDs

| Variable | Value | Source |
|----------|-------|--------|
| `UNIFI_HOST_ID` | `A89C6C16006300000000097C886C000000000A0122EC0000000068D6A71F:1188350503` | `GET /ea/hosts` response |
| `UNIFI_SITE_ID` | `66cb80b71ceeae603ea314a7` | `GET /ea/sites` response |
| `UNIFI_SITE_NAME` | `default` | `GET /ea/sites` response |
| `UNIFI_GATEWAY_HARDWARE_ID` | `f5fc3ddc-2288-55fd-82de-30854817e1b9` | `GET /ea/sites` → `statistics.gateway.hardwareId` |

> **Note:** The gateway hardware ID (`f5fc3ddc-...`) was previously used as `UNIFI_CONSOLE_ID` in proxy URLs. This is incorrect — it is the UDR's internal hardware identifier, not the host ID used by the API.

---

## What Doesn't Exist

Endpoints that return 404 — confirmed by direct testing:

- `GET /v1/clients`
- `GET /v1/clients?hostIds[]={hostId}`
- `GET /v1/clients?siteIds[]={siteId}`
- `GET /v1/sites/{siteId}/clients`
- `GET /ea/console/{hostId}/proxy/network/v2/api/site/default/stat/sta`

---

## Architectural Options for Per-Device Traffic Data

| Option | Feasibility | Notes |
|--------|-------------|-------|
| **Local controller API** | High (if on-prem) | `GET /proxy/network/api/s/{site}/stat/sta` on the local UDR. Returns `rx_bytes-r`, `tx_bytes-r`, `last_seen` per client. Requires network access to the console — not available from Vercel. |
| **MQTT/WebRTC** | Low (Vercel) | Requires persistent connection and AWS credential refresh. Incompatible with stateless serverless functions. |
| **Aggregate stats only** | High (works today) | `GET /ea/sites` returns total client counts and WAN uptime. No per-device bandwidth. |

The local controller API (`/proxy/network/api/s/default/stat/sta`) is the correct long-term path for per-device traffic monitoring, but requires hosting the Next.js app on a machine with LAN access to the UDR (e.g. Raspberry Pi, NAS) rather than Vercel.
