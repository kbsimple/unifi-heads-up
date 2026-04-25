# UniFi Console API Client

How `src/lib/unifi/client.ts` communicates with the UniFi console.

## Transport — `undici` with a scoped TLS Agent

The client uses Node's `undici` library (not browser `fetch`) because the UniFi console presents a self-signed TLS certificate. A singleton `Agent` is created once at module load with `rejectUnauthorized: false`, and that agent is passed as `dispatcher` on every request:

```ts
const agent = new Agent({
  connect: { rejectUnauthorized: false },
})
```

TLS verification is bypassed **only** for requests to the console — the rest of the Next.js process is unaffected. This is the correct approach; the alternative (`NODE_TLS_REJECT_UNAUTHORIZED=0`) would disable TLS verification for the entire process.

## Authentication — `X-API-KEY` header

Every request sends the API key as `X-API-KEY: <value>`. There is no session cookie or OAuth flow — UniFi's local API uses a static API key generated in UniFi OS > Settings > API.

## Base URL

All requests go to:

```
https://<UNIFI_HOST>/proxy/network/v2/api/site/default/<endpoint>
```

`UNIFI_HOST` is read from the environment and can include a port (e.g., `192.168.1.1:8443` for older controllers). The helper function reads `process.env.UNIFI_HOST` inside the function body (not at module level) so tests can swap the value between cases.

## Endpoints

| Function | Method | Path | Purpose |
|---|---|---|---|
| `getUnifiClients()` | GET | `/stat/sta` | All connected clients — name, MAC, IP, live traffic bytes (`rx_bytes-r`, `tx_bytes-r`), `last_seen` |
| `getFirewallPolicies()` | GET | `/firewall-policies` | All firewall rules — `_id`, `name`, `enabled` |
| `updateFirewallPolicy(id, enabled)` | PUT | `/firewall-policies/:id` | Toggle a rule's `enabled` flag |
| `isZoneBasedFirewallEnabled()` | GET | `/site-feature-migration` | Detect Zone-Based Firewall mode — UI adapts based on this |

## Response Validation

Every response is parsed through a Zod schema before use. If the console returns an unexpected shape the function throws immediately rather than letting malformed data reach the UI.

## Mock Layer

When `UNIFI_MOCK=true`, `src/lib/unifi/index.ts` routes to `mock.ts` instead and `client.ts` is never called. The mock and real client share the same function signatures — the rest of the app is unaware of the difference.

## Traffic Status Calculation

`getUnifiClients()` maps `rx_bytes-r` and `tx_bytes-r` (real-time byte rates reported by the controller) through `calculateTrafficStatus()` in `src/lib/unifi/traffic.ts`. The result is one of `high | medium | low | idle`, displayed as a badge per device.

## Required Environment Variables

| Variable | Description |
|---|---|
| `UNIFI_HOST` | LAN IP or hostname of the console, e.g. `192.168.1.1` or `192.168.1.1:8443` |
| `UNIFI_API_KEY` | API key from UniFi OS > Settings > API |
