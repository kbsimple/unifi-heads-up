# Technology Stack

**Project:** UniFi Network Dashboard
**Last Updated:** 2026-07-18
**Active Milestone:** v5.0 Streamlining Management UX Flows

---

## v5.0 Stack Research (2026-07-18)

**Scope:** Additive research for three new features: rule-to-device mapping, inline firewall toggle, /statusz health page UI.

### Verdict: No New npm Packages Required

All three v5.0 features are achievable with the existing dependency set. The work is schema extension, new TypeScript mapping logic, one new client function (health probe), and one new page — none of which require new packages.

---

### Feature 1: Rule-to-Device Mapping

#### Critical Finding: IP Groups Do NOT Apply to Zone-Based Firewall

The codebase uses the zone-based firewall endpoint (`/proxy/network/v2/api/site/default/firewall-policies`). The "IP groups" / "address groups" concept belongs exclusively to the **classic firewall rule** system (`/api/s/{site}/rest/firewallrule` + `/api/s/{site}/rest/firewallgroup`). These are two separate, incompatible firewall systems. The app is on ZBF.

In zone-based firewall policies, device-specific targeting uses `client_macs` inside the `source` and `destination` endpoint objects. There is no IP group membership to resolve — no separate API call is needed.

Confirmed from aiounifi v2 model (`FirewallPolicyEndpoint` TypedDict, [source](https://github.com/Kane610/aiounifi/blob/master/aiounifi/models/firewall_policy.py)):

```python
class FirewallPolicyEndpoint(TypedDict):
    match_opposite_ports: bool
    matching_target: str         # e.g. "ANY", "ZONE" — string enum, full values undocumented
    port_matching_type: str
    zone_id: str
    client_macs: NotRequired[list[str]]   # present only when policy targets specific devices
```

**Confidence:** MEDIUM (aiounifi is a well-maintained community library that tracks the live API; official Ubiquiti schema documentation is not publicly accessible via web fetch)

#### What Mapping Logic Needs to Do

For each `FirewallPolicy` returned by the existing `getFirewallPolicies()`:
1. Check `source.client_macs` — if the device's MAC is here, the policy restricts traffic FROM that device
2. Check `destination.client_macs` — if the device's MAC is here, the policy restricts traffic TO that device
3. If neither has `client_macs` (or both are empty), the policy is zone-wide — not device-specific

IP address and IP group matching do NOT apply to ZBF policies. The milestone phrasing "by MAC, IP, or IP group membership" resolves to MAC-only for ZBF mode.

For reference only (not needed for this milestone): classic firewall rules use `src_mac` (top-level) and `src_firewall_group_ids`/`dst_firewall_group_ids` referencing groups at `/api/s/default/rest/firewallgroup`. If `isZoneBasedFirewallEnabled()` ever returns false, this would be the alternate path — but that is out of scope for v5.0.

#### No New API Endpoint Needed

`getFirewallPolicies()` already fetches all policies. The `source` and `destination` objects already pass through `FirewallPolicySchema.passthrough()`. Mapping is pure in-process logic over already-fetched data.

#### FirewallPolicySchema Changes Required

`FirewallPolicySchema` needs typed `source` and `destination` fields so the mapping logic can access `client_macs` with TypeScript type safety rather than casting through `unknown`. The outer `.passthrough()` already preserves these objects in the raw output — adding explicit fields just makes them typed.

**Proposed addition to `src/lib/unifi/types.ts`:**

```typescript
// New sub-schema
export const FirewallPolicyEndpointSchema = z.object({
  zone_id: z.string().optional(),
  matching_target: z.string().optional(),
  port_matching_type: z.string().optional(),
  match_opposite_ports: z.boolean().optional(),
  client_macs: z.array(z.string()).optional(),
}).passthrough()

export type FirewallPolicyEndpoint = z.infer<typeof FirewallPolicyEndpointSchema>

// Inside FirewallPolicySchema's .object({...}), add:
source: FirewallPolicyEndpointSchema.optional(),
destination: FirewallPolicyEndpointSchema.optional(),
```

No change to `getFirewallPolicies()` itself. No change to the API route.

#### Mock Layer Changes

`mock.ts` policy objects need `source` and `destination` added to at least some entries so tests can exercise the mapping logic:

```typescript
// Example — policy targeting a specific device:
{
  _id: 'policy-1',
  name: 'Block Gaming Consoles',
  enabled: true,
  source: {
    zone_id: 'lan',
    matching_target: 'CLIENT',
    client_macs: ['aa:bb:cc:dd:ee:06'],   // Nintendo Switch from MOCK_CLIENTS
  },
  destination: { zone_id: 'wan', matching_target: 'ANY' },
}
```

---

### Feature 2: Inline Firewall Shortcut

No new API endpoints or packages. Reuses:
- `getFirewallPolicies()` — existing
- `updateFirewallPolicy(id, enabled)` — existing, exposed via `/api/firewall` PUT
- Rule-to-device mapping from Feature 1

The component needs to: receive the device MAC, filter the already-fetched policies list to those matching the MAC, and render a toggle per matched policy using the existing `Switch` component from shadcn/ui.

**Existing dependencies already cover this:**
- `Switch` from shadcn/ui — already used on the Firewall page
- `Badge` from shadcn/ui — already used for traffic status
- `swr` — already in use for polling at dashboard level

---

### Feature 3: /statusz Health Page

#### Existing Endpoint: `/api/statusz`

Current response (from `src/app/api/statusz/route.ts`):
```json
{
  "uptime": 3612,
  "buildId": "abc123",
  "nodeVersion": "v22.x.x",
  "memoryMb": 148,
  "nodeEnv": "production"
}
```

PROJECT.md requires adding: DB connectivity, UniFi proxy reachability, app version.

#### Endpoint Enhancement

**DB connectivity check** — synchronous, uses existing `getDb()` from `src/lib/db/index.ts`:
```typescript
import { getDb } from '@/lib/db'
let dbOk = false
try {
  getDb().prepare('SELECT 1').get()
  dbOk = true
} catch { /* stays false */ }
```
`better-sqlite3` is synchronous — no await needed.

**UniFi proxy reachability** — needs a new lightweight function in `client.ts`. The `/stat/health` endpoint is the correct probe target: it returns aggregate site health stats, is read-only, and is lighter than `/stat/sta` (no per-client data).

**New export for `src/lib/unifi/client.ts`:**
```typescript
export async function probeUnifiHealth(): Promise<boolean> {
  const response = await fetch(`${baseUrl()}/stat/health`, {
    dispatcher: agent,
    signal: AbortSignal.timeout(5_000),
    headers: { 'X-API-KEY': process.env.UNIFI_API_KEY! },
  })
  return response.ok
}
```

**New export for `src/lib/unifi/mock.ts`:**
```typescript
export async function probeUnifiHealth(): Promise<boolean> {
  return true  // mock always healthy
}
```

**Add to `src/lib/unifi/index.ts`:**
```typescript
export const probeUnifiHealth = impl.probeUnifiHealth
```

#### /statusz UI Page

A Server Component at `src/app/statusz/page.tsx`:
- NOT behind auth (health pages must be accessible without a session)
- Calls server functions directly (not via HTTP self-fetch)
- Renders DB status, UniFi status, uptime, build ID, Node version, memory
- Sits outside the `dashboard/` and `(auth)/` route groups

**Stack usage:**
- Server Component (default App Router behavior — no `'use client'`)
- `Card`, `CardHeader`, `CardContent` from shadcn/ui — already installed
- `Badge` for status indicators — already installed
- No SWR needed (manual refresh sufficient for a health page)

---

### Change Surface Summary

| File | Change Type | What Changes |
|------|-------------|--------------|
| `src/lib/unifi/types.ts` | Schema extension | Add `FirewallPolicyEndpointSchema`; add `source`/`destination` to `FirewallPolicySchema` |
| `src/lib/unifi/client.ts` | New function | Add `probeUnifiHealth()` |
| `src/lib/unifi/mock.ts` | Update data + new function | Add `source`/`destination` to mock policies; add `probeUnifiHealth()` |
| `src/lib/unifi/index.ts` | Export | Add `probeUnifiHealth` export |
| `src/app/api/statusz/route.ts` | Enhancement | Add DB check, UniFi probe, enrich response shape |
| `src/app/statusz/page.tsx` | New file | Server Component health UI |
| Dashboard device row component | New logic | Rule-to-device mapping + inline toggle |

### Existing Stack Confirmed Sufficient

| Technology | Version | v5.0 Role | Status |
|------------|---------|-----------|--------|
| Next.js | 16.2.3 | Server Components, API routes | No change |
| React | 19.2.4 | UI components | No change |
| TypeScript | ^5 | Type-safe schema extensions | No change |
| Tailwind CSS | ^4 | Styling | No change |
| shadcn/ui | ^4.2.0 | Card, Badge, Switch for statusz + inline toggle | No change |
| Zod | ^4.3.6 | Schema extension for endpoint sub-schema | Schema update only |
| better-sqlite3 | ^12.10.0 | DB health check in statusz | No change |
| undici (Node built-in) | — | UniFi health probe reuses existing agent | No change |
| swr | ^2.4.1 | Already polls policies at dashboard level | No change |
| server-only | ^0.0.1 | Already guards client.ts | No change |

### Confidence Assessment

| Finding | Confidence | Basis |
|---------|------------|-------|
| No new npm packages needed | HIGH | Audited all three feature requirements against package.json |
| ZBF uses `client_macs` for device targeting, not IP groups | MEDIUM | aiounifi TypedDict (well-maintained, tracks live API); no official Ubiquiti schema docs accessible |
| `matching_target` field values (ANY, ZONE, etc.) | LOW | Single source (unpoller issue showing "ANY"); full enum not documented publicly |
| `/stat/health` as lightweight probe endpoint | MEDIUM | UniFi community wiki + classic API reference; not firmware-version-tested |
| `source`/`destination` already preserved via `.passthrough()` | HIGH | Direct code inspection of `FirewallPolicySchema` in `types.ts` |
| statusz UI needs no new packages | HIGH | Display-only; shadcn/ui Card + Badge cover the requirement |

### Open Questions for Phase Planning

1. **`matching_target` enum**: Full list of values the console returns for device-specific policies is unknown without live UAT. Mapping logic should not filter by `matching_target` value — just look for the presence of `client_macs` in source or destination.

2. **ZBF vs. classic rules fallback**: If `isZoneBasedFirewallEnabled()` returns false (older firmware), this mapping approach does not apply. Classic rules use `src_mac` at the top level and `src_firewall_group_ids`/`dst_firewall_group_ids` referencing `/rest/firewallgroup`. Scope v5.0 to ZBF only; show a "not supported" state if ZBF is not active.

3. **statusz auth boundary**: Confirm `/statusz` is outside the `(auth)` and `dashboard` route groups in the App Router layout tree so it is accessible without a session.

### Sources

- [Kane610/aiounifi — firewall_policy.py](https://github.com/Kane610/aiounifi/blob/master/aiounifi/models/firewall_policy.py) — MEDIUM confidence
- [Pulumi UniFi firewall.Rule properties](https://www.pulumi.com/registry/packages/unifi/api-docs/firewall/rule/) — MEDIUM confidence (classic rules schema, not ZBF)
- [Art-of-WiFi UniFi API Reference](https://github.com/Art-of-WiFi/UniFi-API-client/blob/main/API_REFERENCE.md) — MEDIUM confidence (classic API)
- [Ubiquiti Community Wiki — API](https://ubntwiki.com/products/software/unifi-controller/api) — LOW confidence (reverse-engineered)
- [unpoller/unpoller Issue #928](https://github.com/unpoller/unpoller/issues/928) — LOW confidence (single example, `matching_target: "ANY"`)
- Code inspection: `types.ts`, `client.ts`, `mock.ts`, `api/statusz/route.ts`, `db/index.ts` — HIGH confidence

---

## v2.0 Stack Research (2026-04-24)

**Scope:** Stack additions and changes for direct local UniFi API client + self-hosted deployment. Base stack (Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, SWR, Recharts, jose, ky, Zod, Vitest+RTL) is validated and unchanged.

### What Changes in v2.0

Three areas required new or changed stack decisions:

1. **UniFi client rewrite** — replace Site Manager Proxy with direct local console API
2. **Self-signed TLS** — local UniFi console uses a self-signed HTTPS certificate
3. **Deployment** — remove Vercel, containerize with Docker standalone build

### 1. Direct Local UniFi API Client

**Authentication pattern**

On UniFi OS consoles (Dream Machine Pro, UDM-SE, Cloud Gateway, etc.), the same `X-API-KEY` header used by the Site Manager Proxy also authenticates direct local requests. The key is generated locally at **UniFi Network → Settings → Control Plane → Integrations → Create New API Key** (requires Network Application v9.3.43+). No login/logout flow or session cookie is needed.

**Confidence:** MEDIUM — confirmed by multiple community sources and the Art-of-WiFi API client implementation; not explicitly stated in official Ubiquiti docs found during research.

**Endpoint structure**

The local equivalent of the cloud proxy strips the cloud prefix and hits the console directly:
```
https://{LAN_IP}/proxy/network/v2/api/site/default/stat/sta
https://{LAN_IP}/proxy/network/v2/api/site/default/firewall-policies
https://{LAN_IP}/proxy/network/v2/api/site/default/site-feature-migration
```

The `/proxy/network/` prefix is required for all UniFi OS-based consoles — it routes through UniFi OS to the Network Application. The path suffix is identical to what the codebase used via the cloud proxy.

**Important:** The official `integration/v1` API (`/proxy/network/integration/v1/`) does not expose `rx_bytes-r` / `tx_bytes-r` real-time traffic fields or the firewall policies endpoints. Stick with the classic API path (`/proxy/network/v2/api/`).

**Confidence:** MEDIUM — the v2 path mirroring is strongly implied by how the Site Manager proxy works; validated empirically on target hardware.

### 2. Self-Signed TLS Certificate Handling

`NODE_TLS_REJECT_UNAUTHORIZED=0` disables TLS verification globally — do not use it.

**Solution: `undici` Agent dispatcher (no new package)**

Node.js 18+ ships `undici` as its native fetch implementation. A scoped `Agent` with `rejectUnauthorized: false` disables verification only for the UniFi console fetch calls:

```typescript
import { Agent } from 'undici'

const agent = new Agent({
  connect: { rejectUnauthorized: false },
})

// Pass as dispatcher on every fetch to the UniFi console:
const response = await fetch(`${baseUrl()}/stat/sta`, {
  dispatcher: agent,
  headers: { 'X-API-KEY': apiKey },
})
```

`undici` is not a new dependency — it is bundled with Node.js 18+. No `npm install` required.

**Confidence:** HIGH — undici Agent dispatcher behavior confirmed in Next.js GitHub discussions and Node.js undici issues.

### 3. Docker / Self-Hosted Deployment

**Next.js standalone output** (`output: 'standalone'` in `next.config.ts`) produces `.next/standalone/` — a self-contained directory with a `server.js` entrypoint. No `npm install` is needed in the production container.

**Dockerfile pattern (multi-stage, Node 22 Alpine):**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**Confidence:** HIGH — official Next.js self-hosting docs + multiple 2025 deployment guides.

### 4. Vercel-Specific Removals

No Vercel-specific features were found in the codebase (`vercel.json`, edge runtime, `NEXT_PUBLIC_` API keys). No removals needed.

### Summary of v2.0 Stack Changes

#### Added (config/infra only — no new npm packages)

| Change | Where | Why |
|--------|-------|-----|
| `output: 'standalone'` | `next.config.ts` | Enables Docker deployment |
| `Dockerfile` (multi-stage) | project root | Builds and runs the standalone output |
| `UNIFI_HOST` env var | `.env.local`, docker run | Points to console LAN IP |
| `undici` Agent for TLS | `src/lib/unifi/client.ts` | Scoped self-signed cert bypass |

#### Removed

| Change | Why |
|--------|-----|
| `UNIFI_CONSOLE_ID` env var | No longer needed — direct LAN access |
| Site Manager base URL (`api.ui.com`) | Replaced with LAN IP |

### v2.0 Sources

- **Next.js Self-Hosting Guide** — [nextjs.org/docs/app/guides/self-hosting](https://nextjs.org/docs/app/guides/self-hosting) — HIGH confidence
- **undici Agent with rejectUnauthorized** — [github.com/vercel/next.js/discussions/74187](https://github.com/vercel/next.js/discussions/74187) — HIGH confidence
- **UniFi API Key Authentication** — [help.ui.com/hc/en-us/articles/30076656117655](https://help.ui.com/hc/en-us/articles/30076656117655) — MEDIUM confidence
- **UniFi Classic API Reference** — [ubntwiki.com/products/software/unifi-controller/api](https://ubntwiki.com/products/software/unifi-controller/api) — MEDIUM confidence

---
*v5.0 section researched: 2026-07-18*
*v2.0 section researched: 2026-04-24*
