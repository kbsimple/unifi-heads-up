# Phase 6: Local API Client - Patterns

**Mapped:** 2026-04-24
**Phase directory:** `.planning/phases/06-local-api-client`

---

## File Inventory

| File | Action | Role |
|------|--------|------|
| `src/lib/unifi/client.ts` | REWRITE | HTTP client — all four exported functions |
| `tests/lib/unifi/client.test.ts` | UPDATE | Unit tests — mock swap ky → undici |
| `.env.local` | UPDATE | Remove `UNIFI_CONSOLE_ID`, add `UNIFI_HOST` |
| `.env.local.example` | CREATE | Does not exist yet |
| `src/lib/unifi/index.ts` | READ-ONLY | Facade — unchanged, defines the required export surface |
| `src/lib/unifi/mock.ts` | READ-ONLY | Interface reference — function signatures client.ts must match |
| `src/lib/unifi/types.ts` | READ-ONLY | Zod schemas reused unchanged |
| `src/lib/unifi/traffic.ts` | READ-ONLY | Helper reused unchanged |

---

## 1. `src/lib/unifi/client.ts` — REWRITE

### Current import block (to replace)

```typescript
import 'server-only'
import ky from 'ky'
import { z } from 'zod'
import {
  UnifiClientSchema,
  FirewallPolicySchema,
  FirewallPolicyResponseSchema,
  type NetworkClient,
  type ClientsResponse,
  type FirewallPolicy,
} from './types'
import { calculateTrafficStatus } from './traffic'
```

### New import block

```typescript
import 'server-only'
import { fetch, Agent } from 'undici'
import { z } from 'zod'
import {
  UnifiClientSchema,
  FirewallPolicySchema,
  FirewallPolicyResponseSchema,
  type NetworkClient,
  type ClientsResponse,
  type FirewallPolicy,
} from './types'
import { calculateTrafficStatus } from './traffic'
```

Key changes:
- Remove `import ky from 'ky'`
- Add `import { fetch, Agent } from 'undici'` (named imports — no `node:` prefix)
- All other imports carry over unchanged

### Module-level constants (replace `SITE_MANAGER_BASE`)

```typescript
// REMOVE:
const SITE_MANAGER_BASE = 'https://api.ui.com'

// REPLACE WITH:
// Singleton Agent — scoped TLS bypass (D-02, D-03)
// rejectUnauthorized: false handles the console's self-signed cert only
const agent = new Agent({
  connect: { rejectUnauthorized: false },
})

// D-09: UNIFI_HOST may include port (e.g., 192.168.1.1:8443)
function baseUrl(): string {
  return `https://${process.env.UNIFI_HOST}/proxy/network/v2/api/site/default`
}
```

### `transformClient` — unchanged verbatim

```typescript
function transformClient(apiClient: z.infer<typeof UnifiClientSchema>): NetworkClient {
  const displayName = apiClient.name ?? apiClient.hostname ?? apiClient.mac

  return {
    id: apiClient._id,
    mac: apiClient.mac,
    displayName,
    ip: apiClient.ip,
    lastSeen: apiClient.last_seen ? new Date(apiClient.last_seen) : null,
    isWired: apiClient.is_wired ?? false,
    isGuest: apiClient.is_guest ?? false,
    downloadRate: apiClient['rx_bytes-r'],
    uploadRate: apiClient['tx_bytes-r'],
    trafficStatus: calculateTrafficStatus(
      apiClient['rx_bytes-r'],
      apiClient['tx_bytes-r']
    ),
  }
}
```

### `getUnifiClients` — env var guard + fetch pattern

Current env var guard (to replace):
```typescript
const consoleId = process.env.UNIFI_CONSOLE_ID
const apiKey = process.env.UNIFI_API_KEY
if (!consoleId || !apiKey) {
  throw new Error('UNIFI_CONSOLE_ID and UNIFI_API_KEY environment variables are required')
}
```

New env var guard:
```typescript
const host = process.env.UNIFI_HOST
const apiKey = process.env.UNIFI_API_KEY
if (!host || !apiKey) {
  throw new Error('UNIFI_HOST and UNIFI_API_KEY environment variables are required')
}
```

Current ky call:
```typescript
const response = await ky
  .get(`${SITE_MANAGER_BASE}/ea/console/${consoleId}/proxy/network/v2/api/site/default/stat/sta`, {
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    timeout: 10000,
  })
  .json<unknown>()
const clients = UnifiClientSchema.array().parse(response)
return { clients: clients.map(transformClient), timestamp: Date.now() }
```

New undici.fetch call:
```typescript
const response = await fetch(`${baseUrl()}/stat/sta`, {
  dispatcher: agent,
  signal: AbortSignal.timeout(10_000),
  headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
})
if (!response.ok) {
  throw new Error(`UniFi API error: ${response.status} ${response.statusText}`)
}
const data = await response.json() as unknown
const clients = UnifiClientSchema.array().parse(data)
return { clients: clients.map(transformClient), timestamp: Date.now() }
```

### `isZoneBasedFirewallEnabled` — GET pattern (same structure)

Current ky call:
```typescript
const response = await ky
  .get(`${SITE_MANAGER_BASE}/ea/console/${consoleId}/proxy/network/v2/api/site/default/site-feature-migration`, {
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    timeout: 10000,
  })
  .json<unknown>()
const features = FeatureMigrationSchema.parse(response)
```

New undici.fetch call:
```typescript
const response = await fetch(`${baseUrl()}/site-feature-migration`, {
  dispatcher: agent,
  signal: AbortSignal.timeout(10_000),
  headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
})
if (!response.ok) {
  throw new Error(`UniFi API error: ${response.status} ${response.statusText}`)
}
const data = await response.json() as unknown
const features = FeatureMigrationSchema.parse(data)
```

`FeatureMigrationSchema` is defined inline in `client.ts` — keep it unchanged:
```typescript
const FeatureMigrationSchema = z.array(
  z.object({
    feature: z.string(),
    enabled: z.boolean(),
  })
)
```

### `getFirewallPolicies` — GET pattern (same structure)

Current ky call:
```typescript
const response = await ky
  .get(`${SITE_MANAGER_BASE}/ea/console/${consoleId}/proxy/network/v2/api/site/default/firewall-policies`, {
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    timeout: 10000,
  })
  .json<unknown>()
return FirewallPolicyResponseSchema.parse(response)
```

New undici.fetch call:
```typescript
const response = await fetch(`${baseUrl()}/firewall-policies`, {
  dispatcher: agent,
  signal: AbortSignal.timeout(10_000),
  headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
})
if (!response.ok) {
  throw new Error(`UniFi API error: ${response.status} ${response.statusText}`)
}
const data = await response.json() as unknown
return FirewallPolicyResponseSchema.parse(data)
```

### `updateFirewallPolicy` — PUT with JSON body

Current ky call (uses `ky`'s `json:` option):
```typescript
const response = await ky
  .put(`${SITE_MANAGER_BASE}/ea/console/${consoleId}/proxy/network/v2/api/site/default/firewall-policies/${policyId}`, {
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    json: { enabled },
    timeout: 10000,
  })
  .json<unknown>()
return FirewallPolicySchema.parse(response)
```

New undici.fetch call (standard fetch body — no `json:` shorthand):
```typescript
const response = await fetch(`${baseUrl()}/firewall-policies/${policyId}`, {
  dispatcher: agent,
  method: 'PUT',
  signal: AbortSignal.timeout(10_000),
  headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ enabled }),
})
if (!response.ok) {
  throw new Error(`UniFi API error: ${response.status} ${response.statusText}`)
}
const data = await response.json() as unknown
return FirewallPolicySchema.parse(data)
```

### Exported function signatures — must remain identical

These signatures are required by `index.ts` and must not change:

```typescript
export async function getUnifiClients(): Promise<ClientsResponse>
export async function isZoneBasedFirewallEnabled(): Promise<boolean>
export async function getFirewallPolicies(): Promise<FirewallPolicy[]>
export async function updateFirewallPolicy(policyId: string, enabled: boolean): Promise<FirewallPolicy>
```

---

## 2. `tests/lib/unifi/client.test.ts` — UPDATE

### Current mock setup (lines 4–17, to replace)

```typescript
// Current — mocks ky
vi.mock('ky', () => ({
  default: Object.assign(
    vi.fn(),
    {
      get: vi.fn(),
    }
  ),
}))

vi.mock('server-only', () => ({}))

import ky from 'ky'
import { getUnifiClients } from '@/lib/unifi/client'
```

### New mock setup

```typescript
// New — mocks undici
vi.mock('undici', () => ({
  Agent: vi.fn().mockImplementation(() => ({})),
  fetch: vi.fn(),
}))

vi.mock('server-only', () => ({}))

import { fetch } from 'undici'
import { getUnifiClients } from '@/lib/unifi/client'
```

### Current per-test mock call site (to replace in every `it` block)

```typescript
// Current pattern — ky.get returns object with .json()
vi.mocked(ky.get).mockReturnValue({
  json: () => Promise.resolve(mockResponse),
} as unknown as ReturnType<typeof ky.get>)
```

### New per-test mock call site

```typescript
// New pattern — fetch returns Response-like object
vi.mocked(fetch).mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: () => Promise.resolve(mockResponse),
} as unknown as Response)
```

### Current env var setup in `beforeEach` (lines 22–26, to update)

```typescript
// Current
process.env.UNIFI_CONSOLE_ID = 'test-console-id'
process.env.UNIFI_API_KEY = 'test-api-key'
```

### New env var setup

```typescript
// New — UNIFI_CONSOLE_ID replaced by UNIFI_HOST
process.env.UNIFI_HOST = '192.168.1.1'
process.env.UNIFI_API_KEY = 'test-api-key'
```

### Error test — mock pattern for non-ok response

```typescript
// For testing HTTP error propagation (response.ok === false)
vi.mocked(fetch).mockResolvedValue({
  ok: false,
  status: 403,
  statusText: 'Forbidden',
  json: () => Promise.resolve({ error: 'forbidden' }),
} as unknown as Response)
```

### Error test — mock pattern for network-level rejection

```typescript
// For testing network errors (ECONNREFUSED, etc.)
vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
```

### Test assertions — carry over unchanged

All existing `expect(result.clients[0]).toMatchObject(...)` assertions are preserved. The data transformation logic (`transformClient`, Zod parsing) is identical — only the mock plumbing changes.

New assertion to add for LOCAL-02 (undici Agent creation):

```typescript
it('creates undici Agent with rejectUnauthorized: false', async () => {
  const { Agent } = await import('undici')
  expect(Agent).toHaveBeenCalledWith({
    connect: { rejectUnauthorized: false },
  })
})
```

---

## 3. `.env.local` — UPDATE

### Current state (lines 8–9)

```bash
UNIFI_API_KEY="mock-api-key"
UNIFI_CONSOLE_ID="mock-console-id"
```

### Required change

```bash
# REMOVE:
UNIFI_CONSOLE_ID="mock-console-id"

# ADD:
UNIFI_HOST="192.168.1.1"
```

`UNIFI_API_KEY` stays unchanged (value will change from `"mock-api-key"` to the real key when deploying against a live console, but the variable name is unchanged per D-06).

All other lines in `.env.local` are untouched:
- `ADMIN_PASSWORD`, `ADMIN_USER`, `FAMILY_PASSWORD`, `FAMILY_USER`
- `SESSION_SECRET`
- `UNIFI_MOCK`
- `VERCEL_OIDC_TOKEN`

---

## 4. `.env.local.example` — CREATE

File does not currently exist. Create at project root.

```bash
# UniFi Console — LAN direct (no cloud proxy)
# Set UNIFI_HOST to the console's LAN IP or hostname.
# Include :port if the console is not on port 443 (e.g., 192.168.1.1:8443 for older controllers).
UNIFI_HOST="192.168.1.1"

# API key from: UniFi OS > Settings > API > Create API Key
UNIFI_API_KEY="your-api-key-here"

# App authentication (bcrypt hashes)
ADMIN_USER="admin"
ADMIN_PASSWORD="bcrypt-hash-here"
FAMILY_USER="family"
FAMILY_PASSWORD="bcrypt-hash-here"

# Session signing key — minimum 32 characters, random
SESSION_SECRET="minimum-32-character-random-string-here"

# Development mode — skips the real console entirely
# UNIFI_MOCK="true"
```

---

## 5. Read-Only Reference Files

### `src/lib/unifi/index.ts` — facade, unchanged

```typescript
// The facade evaluates UNIFI_MOCK once at module init — unchanged
import * as real from './client'
import * as mock from './mock'

const impl = process.env.UNIFI_MOCK === 'true' ? mock : real

export const getUnifiClients            = impl.getUnifiClients
export const getFirewallPolicies        = impl.getFirewallPolicies
export const updateFirewallPolicy       = impl.updateFirewallPolicy
export const isZoneBasedFirewallEnabled = impl.isZoneBasedFirewallEnabled
```

The facade is what requires the four exported function signatures to remain identical.

### `src/lib/unifi/mock.ts` — interface reference

Mock exports mirror the exact signatures client.ts must export:

```typescript
export async function getUnifiClients(): Promise<ClientsResponse>
export async function getFirewallPolicies(): Promise<FirewallPolicy[]>
export async function updateFirewallPolicy(policyId: string, enabled: boolean): Promise<FirewallPolicy>
export async function isZoneBasedFirewallEnabled(): Promise<boolean>
```

### `src/lib/unifi/types.ts` — Zod schemas reused unchanged

Three schemas used in `client.ts`:
- `UnifiClientSchema` — used as `UnifiClientSchema.array().parse(data)`
- `FirewallPolicyResponseSchema` — used as `FirewallPolicyResponseSchema.parse(data)`
- `FirewallPolicySchema` — used as `FirewallPolicySchema.parse(data)` in `updateFirewallPolicy`

One local schema defined inside `client.ts` (not in `types.ts`):
- `FeatureMigrationSchema` — keep inline in `client.ts`, unchanged

### `src/lib/unifi/traffic.ts` — helper reused unchanged

```typescript
// Called in transformClient:
trafficStatus: calculateTrafficStatus(apiClient['rx_bytes-r'], apiClient['tx_bytes-r'])
```

---

## 6. Endpoint URL Map

| Function | Old URL (Site Manager proxy) | New URL (local LAN) |
|----------|------------------------------|---------------------|
| `getUnifiClients` | `https://api.ui.com/ea/console/${consoleId}/proxy/network/v2/api/site/default/stat/sta` | `https://${UNIFI_HOST}/proxy/network/v2/api/site/default/stat/sta` |
| `isZoneBasedFirewallEnabled` | `https://api.ui.com/ea/console/${consoleId}/proxy/network/v2/api/site/default/site-feature-migration` | `https://${UNIFI_HOST}/proxy/network/v2/api/site/default/site-feature-migration` |
| `getFirewallPolicies` | `https://api.ui.com/ea/console/${consoleId}/proxy/network/v2/api/site/default/firewall-policies` | `https://${UNIFI_HOST}/proxy/network/v2/api/site/default/firewall-policies` |
| `updateFirewallPolicy` | `https://api.ui.com/ea/console/${consoleId}/proxy/network/v2/api/site/default/firewall-policies/${policyId}` | `https://${UNIFI_HOST}/proxy/network/v2/api/site/default/firewall-policies/${policyId}` |

The `/proxy/network/v2/api/site/default` suffix is identical in both cases — only the host prefix changes.

---

## 7. Critical Behavioral Difference: ky vs undici.fetch

| Behavior | ky (current) | undici.fetch (new) |
|----------|-------------|-------------------|
| Non-2xx HTTP response | Throws `HTTPError` automatically | `response.ok === false`; must check manually |
| Response body access | `.json<T>()` chained on request | `await response.json() as unknown` after `response.ok` check |
| Timeout | `timeout: 10000` option | `signal: AbortSignal.timeout(10_000)` |
| PUT body | `json: { enabled }` option | `body: JSON.stringify({ enabled })` + `Content-Type` header |
| TLS configuration | No built-in scoped TLS bypass | `dispatcher: agent` with `Agent({ connect: { rejectUnauthorized: false } })` |

The `if (!response.ok) throw new Error(...)` guard is mandatory before every `response.json()` call. Missing it is the most common migration pitfall.

---

*Phase: 06-local-api-client*
*Patterns mapped: 2026-04-24*
