# Phase 5: Dev Mock Layer - Research

**Researched:** 2026-04-19
**Domain:** Next.js server-side module switching, in-memory state, TypeScript mock patterns
**Confidence:** HIGH

## Summary

Phase 5 adds a dev-only mock layer that intercepts calls to the three UniFi client exports — `getUnifiClients()`, `getFirewallPolicies()`, and `updateFirewallPolicy()` — when `UNIFI_MOCK=true`. The real `client.ts` and its types must remain untouched (MOCK-02). The switching point is a thin facade module that reads `process.env.UNIFI_MOCK` at import time and re-exports either the real implementation or the mock.

The mock module holds its mutable firewall-toggle state as a module-level `let` variable. In Next.js dev mode, that variable survives page refreshes (the Node.js server process keeps running) but resets when the dev server is restarted — which is exactly the intended behaviour described in REQUIREMENTS.md.

The traffic-status thresholds in `traffic.ts` work in Mbps, not bytes/s. Mock client data must be expressed in bytes/s and must cross the correct Mbps boundaries: Idle < ~125 KB/s total, Low 125 KB/s–1.25 MB/s, Medium 1.25 MB/s–12.5 MB/s, High > 12.5 MB/s (derived from the 1/10/100 Mbps thresholds in `traffic.ts`).

**Primary recommendation:** Implement a `src/lib/unifi/index.ts` facade that re-exports from either `client.ts` or `mock.ts` based on `process.env.UNIFI_MOCK`. API routes import from the facade, not directly from `client.ts`. `client.ts` is not modified.

---

## Phase Requirements

<phase_requirements>

| ID | Description | Research Support |
|----|-------------|------------------|
| MOCK-01 | When `UNIFI_MOCK=true`, app uses mock data | Facade pattern at `src/lib/unifi/index.ts` — reads env var at module load time |
| MOCK-02 | Real UniFi client code unchanged | Facade wraps `client.ts`; `client.ts` not edited |
| MOCK-03 | `dev.sh` sets `UNIFI_MOCK=true` automatically | Single `export UNIFI_MOCK=true` line added to existing `dev.sh` |
| MOCK-04 | Mock returns ≥3 realistic firewall rules with varied states | Hardcoded in `mock.ts` as a module-level const |
| MOCK-05 | Toggling a mock rule updates enabled state in-memory | Module-level `let mockPolicies` that `updateFirewallPolicy` mutates |
| MOCK-06 | Mock returns ≥6 network clients | Hardcoded in `mock.ts` |
| MOCK-07 | Mock clients cover High/Medium/Low/Idle statuses | Data values designed against actual `calculateTrafficStatus()` thresholds |
| MOCK-08 | Mock client data includes name, MAC, IP, bytes/s consistent with status | Full `NetworkClient` shape from `types.ts` |

</phase_requirements>

---

## Standard Stack

No new libraries needed. All existing dependencies cover the requirements.

### Core (already installed)
| Library | Version | Purpose |
|---------|---------|---------|
| TypeScript | ^5 | Type-safe mock module |
| `server-only` | ^0.0.1 | Applied to facade to prevent client-side import |
| Zod | ^4.3.6 | Types already defined — mock does not re-validate |

### Supporting (no additions)

`dev.sh` modification is a one-line shell edit. No new npm dependencies.

---

## Architecture Patterns

### Pattern 1: Facade Module (env-var switching)

**What:** A new `src/lib/unifi/index.ts` reads `process.env.UNIFI_MOCK` and conditionally re-exports from either `client.ts` or `mock.ts`. API routes switch their import from `@/lib/unifi/client` to `@/lib/unifi` (or the explicit `@/lib/unifi/index`).

**Why this, not alternatives:**

- Dynamic `require()` inside exported functions also works but is an anti-pattern in ESM TypeScript — tree-shaker unfriendly and loses static type checking.
- Replacing `client.ts` body with an if/else branch violates MOCK-02 (real code unchanged).
- MSW / fetch interception is explicitly ruled out in REQUIREMENTS.md Out of Scope.

**Key constraint:** `process.env.UNIFI_MOCK` is evaluated when the module is first imported by the Node.js runtime. In Next.js dev mode, this happens once per server startup (not per request), which is correct. The env var cannot be flipped at runtime without a server restart.

```typescript
// src/lib/unifi/index.ts
// Source: standard Next.js server-only pattern
import 'server-only'

export {
  getUnifiClients,
  getFirewallPolicies,
  updateFirewallPolicy,
  isZoneBasedFirewallEnabled,
} from process.env.UNIFI_MOCK === 'true'
  ? './mock'
  : './client'
```

**Note on re-export syntax:** The conditional re-export above is not valid ECMAScript (export cannot take a runtime expression). The correct pattern is a conditional import at the top of the file using a ternary, exporting bound functions. See the Code Examples section for the working pattern.

### Pattern 2: Module-Level Mutable State for Toggle Persistence

**What:** The mock module holds a `let mockPolicies` array at module scope. `updateFirewallPolicy` mutates this array in place. Because the Node.js process stays alive across HTTP requests (and across browser page refreshes), the state persists for the entire dev session.

**HMR behaviour (VERIFIED via Next.js Fast Refresh docs):** When the developer edits `mock.ts`, Fast Refresh re-executes the file, which resets `mockPolicies` to its initial value. This is acceptable — it is equivalent to a server restart from the mock's perspective, and REQUIREMENTS.md explicitly excludes persistence across restarts. If the developer does not edit `mock.ts`, the variable survives indefinitely.

**Implementation:**
```typescript
// src/lib/unifi/mock.ts
import type { NetworkClient, ClientsResponse, FirewallPolicy } from './types'

// Module-level mutable state — resets on server restart or mock.ts file edit
let mockPolicies: FirewallPolicy[] = [
  { _id: 'policy-1', name: 'Block Gaming Consoles', enabled: true },
  { _id: 'policy-2', name: 'Pause Kids Devices',   enabled: false },
  { _id: 'policy-3', name: 'Guest Network Restrict', enabled: true },
]

export async function getFirewallPolicies(): Promise<FirewallPolicy[]> {
  return mockPolicies
}

export async function updateFirewallPolicy(
  policyId: string,
  enabled: boolean
): Promise<FirewallPolicy> {
  const index = mockPolicies.findIndex(p => p._id === policyId)
  if (index === -1) throw new Error(`Mock policy not found: ${policyId}`)
  mockPolicies[index] = { ...mockPolicies[index], enabled }
  return mockPolicies[index]
}
```

### Pattern 3: Mock NetworkClient Data Aligned to Actual Thresholds

**Critical finding:** `traffic.ts` thresholds are in **Mbps**, but the `NetworkClient` fields `downloadRate` and `uploadRate` are **bytes per second**. The formula is `(bytes * 8) / 1_000_000`. This means:

| Status | Total Mbps threshold | Bytes/s equivalent (combined) |
|--------|---------------------|-------------------------------|
| Idle   | < 1 Mbps            | < ~125,000 bytes/s total      |
| Low    | 1–10 Mbps           | ~125,000–1,250,000 bytes/s    |
| Medium | 10–100 Mbps         | ~1,250,000–12,500,000 bytes/s |
| High   | > 100 Mbps          | > ~12,500,000 bytes/s         |

Mock data must use values that fall clearly within each band to make status badges deterministic. Example values:

```typescript
// Idle: 0 bytes/s download + 0 upload → 0 Mbps
{ downloadRate: 0, uploadRate: 0, trafficStatus: 'idle' }

// Low: 500,000 + 100,000 = 600,000 bytes/s → 4.8 Mbps
{ downloadRate: 500_000, uploadRate: 100_000, trafficStatus: 'low' }

// Medium: 2,000,000 + 500,000 = 2,500,000 bytes/s → 20 Mbps
{ downloadRate: 2_000_000, uploadRate: 500_000, trafficStatus: 'medium' }

// High: 15,000,000 + 2,000,000 = 17,000,000 bytes/s → 136 Mbps
{ downloadRate: 15_000_000, uploadRate: 2_000_000, trafficStatus: 'high' }
```

**Note:** The phase description says "High >1MB/s, Medium >100KB/s, Low >0, Idle=0". This does not match what `traffic.ts` actually implements. The actual thresholds (1/10/100 Mbps) are what matters — mock data must satisfy `calculateTrafficStatus()` as written, not the phase description's simplified summary. The values above are calibrated to the actual code.

### Pattern 4: API Route Import Change

The two API routes currently import directly from `@/lib/unifi/client`. They must be updated to import from the facade:

```typescript
// Before (in route.ts files):
import { getUnifiClients } from '@/lib/unifi/client'

// After:
import { getUnifiClients } from '@/lib/unifi'
```

This is the only change to existing production code (besides `dev.sh`). `client.ts` itself is untouched.

### Pattern 5: dev.sh Addition

```bash
# Add before `npm run dev`:
export UNIFI_MOCK=true
```

The variable must be exported before the `npm run dev` call so that Next.js's Node.js process inherits it. The existing credential exports in `dev.sh` do not need UNIFI_CONSOLE_ID or UNIFI_API_KEY when mock is active.

### Recommended Project Structure (additions only)

```
src/lib/unifi/
├── client.ts        # UNCHANGED — real UniFi API client
├── types.ts         # UNCHANGED — shared types
├── traffic.ts       # UNCHANGED — threshold logic
├── mock.ts          # NEW — mock implementations + in-memory state
└── index.ts         # NEW — facade: re-exports real or mock based on UNIFI_MOCK
```

### Anti-Patterns to Avoid

- **Editing `client.ts` to add mock branches:** Violates MOCK-02. All switching belongs in `index.ts`.
- **Using `NEXT_PUBLIC_UNIFI_MOCK`:** Would expose the env var to the client bundle and allow client-side access. The facade is server-only; use the unprefixed form.
- **Dynamic `import()` inside the exported functions:** Async dynamic imports return Promises, complicating the function signatures. Static re-export in the facade is simpler and correctly typed.
- **Calling `calculateTrafficStatus()` in the mock:** The mock should pre-compute and set `trafficStatus` explicitly. This makes mock data self-documenting and avoids any future threshold-change surprises.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type safety for mock return values | Manual type assertions | Explicit `: FirewallPolicy[]` and `: NetworkClient` annotations | TypeScript will catch shape mismatches at compile time |
| HTTP-level mocking | MSW service worker | Module-level facade | Out of scope per REQUIREMENTS.md; simpler to test |

---

## Common Pitfalls

### Pitfall 1: Threshold Confusion — Mbps vs bytes/s
**What goes wrong:** Mock data written with bytes/s values from the phase description's "100KB/s = Medium" summary end up in the wrong status bucket, causing wrong badge colours in the UI.
**Why it happens:** The phase description uses a simplified summary. `traffic.ts` uses Mbps thresholds (1/10/100). The conversion is `bytes/s * 8 / 1_000_000`.
**How to avoid:** Use the table in Pattern 3 above. Verify each mock client's expected status against `calculateTrafficStatus(downloadRate, uploadRate)` before finalising values.
**Warning signs:** Traffic badge shows a different status than the mock data comment claims.

### Pitfall 2: Module-Level State Reset on Mock File Edit
**What goes wrong:** Developer edits `mock.ts` during a dev session; all toggled firewall states reset.
**Why it happens:** Next.js Fast Refresh re-executes the module when it changes, reinitialising `let mockPolicies`. [VERIFIED: nextjs.org/docs/architecture/fast-refresh]
**How to avoid:** This is expected and acceptable per REQUIREMENTS.md ("In-memory is sufficient for dev iteration"). Document it in a comment in `mock.ts`.
**Warning signs:** N/A — this is intentional behaviour, not a bug.

### Pitfall 3: Forgetting `server-only` on the Facade
**What goes wrong:** A client component accidentally imports from `@/lib/unifi`, receiving a build-time error in prod or silently accessing undefined functions in dev.
**Why it happens:** Without `import 'server-only'` at the top of `index.ts`, Next.js does not enforce the server boundary.
**How to avoid:** Add `import 'server-only'` as the first line of `index.ts`. The existing `client.ts` already uses this pattern.

### Pitfall 4: `UNIFI_MOCK` Not Inherited by Next.js Dev Process
**What goes wrong:** Running `./dev.sh` but mock mode does not activate — real API calls are attempted.
**Why it happens:** If `UNIFI_MOCK=true` is set without `export`, the variable exists in the shell but is not exported to child processes.
**How to avoid:** Use `export UNIFI_MOCK=true` in `dev.sh`, not just `UNIFI_MOCK=true`. Existing credential lines in `dev.sh` correctly use `export`.

### Pitfall 5: API Routes Still Import Directly from `client.ts`
**What goes wrong:** `UNIFI_MOCK=true` is set but the app still calls the real API.
**Why it happens:** `src/app/api/clients/route.ts` and `src/app/api/firewall/route.ts` both currently import from `@/lib/unifi/client` directly, bypassing the facade.
**How to avoid:** Update both route files to import from `@/lib/unifi` (the index facade). This is one of only two changes to existing non-mock files (the other is `dev.sh`).

---

## Code Examples

### Working Facade Pattern (index.ts)

Because `export ... from <expression>` is not valid JavaScript, the facade must use a different approach. Two valid options:

**Option A — Separate import then re-export (recommended for clarity):**
```typescript
// src/lib/unifi/index.ts
// Source: standard Node.js conditional module pattern, verified against TS docs
import 'server-only'

import * as real from './client'
import * as mock from './mock'

const impl = process.env.UNIFI_MOCK === 'true' ? mock : real

export const getUnifiClients    = impl.getUnifiClients
export const getFirewallPolicies = impl.getFirewallPolicies
export const updateFirewallPolicy = impl.updateFirewallPolicy
export const isZoneBasedFirewallEnabled = real.isZoneBasedFirewallEnabled // mock not needed
```

**Option B — Inline ternary per export (also valid):**
```typescript
// src/lib/unifi/index.ts
import 'server-only'

const isMock = process.env.UNIFI_MOCK === 'true'

export { getUnifiClients } from isMock ? './mock' : './client'
// ^ This is still not valid ESM. Use Option A.
```

Option A is the correct approach. The `process.env.UNIFI_MOCK` check happens at module initialisation time (when the server starts), which is the right semantic: one env var, one code path for the entire session.

### Full mock.ts with Correct Threshold Values
```typescript
// src/lib/unifi/mock.ts
// NOTE: This file intentionally has no 'server-only' guard — index.ts enforces it.
import type { NetworkClient, ClientsResponse, FirewallPolicy } from './types'

// Thresholds (from traffic.ts): Idle <1 Mbps, Low 1-10, Medium 10-100, High >100
// Conversion: bytes/s * 8 / 1_000_000 = Mbps
// Idle: <125,000 bytes/s combined | Low: 125K-1.25M | Medium: 1.25M-12.5M | High: >12.5M

const MOCK_CLIENTS: NetworkClient[] = [
  {
    id: 'mock-1',
    mac: 'aa:bb:cc:dd:ee:01',
    displayName: 'MacBook Pro (Work)',
    ip: '192.168.1.101',
    lastSeen: new Date(),
    isWired: true,
    isGuest: false,
    downloadRate: 15_000_000, // 15 MB/s = 120 Mbps → HIGH
    uploadRate: 2_000_000,
    trafficStatus: 'high',
  },
  {
    id: 'mock-2',
    mac: 'aa:bb:cc:dd:ee:02',
    displayName: 'Smart TV',
    ip: '192.168.1.102',
    lastSeen: new Date(),
    isWired: true,
    isGuest: false,
    downloadRate: 2_000_000, // 2 MB/s = 16 Mbps → MEDIUM
    uploadRate: 50_000,
    trafficStatus: 'medium',
  },
  {
    id: 'mock-3',
    mac: 'aa:bb:cc:dd:ee:03',
    displayName: "Dad's iPhone",
    ip: '192.168.1.103',
    lastSeen: new Date(),
    isWired: false,
    isGuest: false,
    downloadRate: 500_000, // 0.5 MB/s = 4 Mbps → LOW
    uploadRate: 100_000,
    trafficStatus: 'low',
  },
  {
    id: 'mock-4',
    mac: 'aa:bb:cc:dd:ee:04',
    displayName: "Mom's iPad",
    ip: '192.168.1.104',
    lastSeen: new Date(),
    isWired: false,
    isGuest: false,
    downloadRate: 300_000, // 0.3 MB/s = 2.4 Mbps → LOW
    uploadRate: 80_000,
    trafficStatus: 'low',
  },
  {
    id: 'mock-5',
    mac: 'aa:bb:cc:dd:ee:05',
    displayName: 'Ring Doorbell',
    ip: '192.168.1.105',
    lastSeen: new Date(),
    isWired: false,
    isGuest: false,
    downloadRate: 0, // Idle
    uploadRate: 0,
    trafficStatus: 'idle',
  },
  {
    id: 'mock-6',
    mac: 'aa:bb:cc:dd:ee:06',
    displayName: 'Nintendo Switch',
    ip: '192.168.1.106',
    lastSeen: new Date(),
    isWired: false,
    isGuest: false,
    downloadRate: 3_500_000, // 3.5 MB/s = 28 Mbps → MEDIUM
    uploadRate: 1_000_000,
    trafficStatus: 'medium',
  },
]

let mockPolicies: FirewallPolicy[] = [
  { _id: 'policy-1', name: 'Block Gaming Consoles',  enabled: true  },
  { _id: 'policy-2', name: 'Pause Kids Devices',     enabled: false },
  { _id: 'policy-3', name: 'Guest Network Restrict', enabled: true  },
]

export async function getUnifiClients(): Promise<ClientsResponse> {
  return { clients: MOCK_CLIENTS, timestamp: Date.now() }
}

export async function getFirewallPolicies(): Promise<FirewallPolicy[]> {
  // Return a shallow copy so callers cannot mutate module state directly
  return mockPolicies.map(p => ({ ...p }))
}

export async function updateFirewallPolicy(
  policyId: string,
  enabled: boolean
): Promise<FirewallPolicy> {
  const index = mockPolicies.findIndex(p => p._id === policyId)
  if (index === -1) throw new Error(`Mock policy not found: ${policyId}`)
  mockPolicies[index] = { ...mockPolicies[index], enabled }
  return { ...mockPolicies[index] }
}

// isZoneBasedFirewallEnabled is handled by real client in index.ts facade;
// if a mock is ever needed: export async function isZoneBasedFirewallEnabled() { return false }
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npm run test:run -- tests/lib/unifi/mock.test.ts` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOCK-04 | `getFirewallPolicies()` returns ≥3 rules with mixed states | unit | `npm run test:run -- tests/lib/unifi/mock.test.ts` | No — Wave 0 |
| MOCK-05 | `updateFirewallPolicy()` mutates in-memory state; subsequent call reflects change | unit | same | No — Wave 0 |
| MOCK-06 | `getUnifiClients()` returns ≥6 clients | unit | same | No — Wave 0 |
| MOCK-07 | Returned clients include at least one of each status: high/medium/low/idle | unit | same | No — Wave 0 |
| MOCK-08 | Each client has non-empty name, valid MAC, IP, and bytes/s fields | unit | same | No — Wave 0 |
| MOCK-01/02 | Facade exports real functions when `UNIFI_MOCK` is not `'true'` | unit | `npm run test:run -- tests/lib/unifi/index.test.ts` | No — Wave 0 |
| MOCK-03 | `dev.sh` contains `export UNIFI_MOCK=true` | shell/manual | `grep "UNIFI_MOCK=true" dev.sh` | N/A |

### Sampling Rate
- **Per task commit:** `npm run test:run -- tests/lib/unifi/mock.test.ts`
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/unifi/mock.test.ts` — covers MOCK-04 through MOCK-08
- [ ] `tests/lib/unifi/index.test.ts` — covers MOCK-01 facade switching

**Existing coverage not impacted:** `tests/app/api/clients/route.test.ts` and `tests/app/api/firewall/route.test.ts` already mock the module at `@/lib/unifi/client`. After the route imports change to `@/lib/unifi`, the mock targets in those test files must update to `vi.mock('@/lib/unifi')` — otherwise the mocks will not intercept and tests will break.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev server | Assumed installed | — | — |
| `npm run dev` | MOCK-03 via dev.sh | Assumed available | — | — |

Step 2.6: No new external tools or services are required. All changes are to TypeScript source files and a shell script.

---

## Runtime State Inventory

Step 2.5: Not applicable — this phase is greenfield addition of new files, not a rename or refactor. No existing stored data, live service config, OS-registered state, secrets, or build artifacts reference the mock layer.

---

## Open Questions

1. **Does `isZoneBasedFirewallEnabled` need a mock?**
   - What we know: The facade in Option A re-exports it from `real` (client.ts) unconditionally. In mock mode, `UNIFI_CONSOLE_ID`/`UNIFI_API_KEY` are not set, so calling it will throw.
   - What's unclear: Whether any UI path calls this function without credentials present. Looking at the API routes, only `getUnifiClients`, `getFirewallPolicies`, and `updateFirewallPolicy` are imported by routes. `isZoneBasedFirewallEnabled` appears to be called elsewhere — the planner should verify all call sites.
   - Recommendation: Add a no-op mock (`return false`) to `mock.ts` and also re-export it from the facade using mock when `UNIFI_MOCK=true`, to be safe.

2. **Should existing route test files be updated in this phase?**
   - What we know: Changing route imports from `@/lib/unifi/client` to `@/lib/unifi` will cause `vi.mock('@/lib/unifi/client')` to stop intercepting in those tests.
   - What's unclear: Whether the GSD plan should explicitly list the mock-target update as a task.
   - Recommendation: Yes — include updating `vi.mock` targets in `route.test.ts` files as an explicit plan task so it does not silently break CI.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `isZoneBasedFirewallEnabled` is not called by any API route in production flow and therefore does not need a mock implementation | Architecture Patterns / Open Questions | If it is called in a route, mock mode will throw missing-credentials error; mitigated by Open Question 1 recommendation |
| A2 | The `MOCK_CLIENTS` array is a `const` and does not need in-memory mutability (only firewall policies need mutation) | Code Examples | If a future requirement adds client toggle, this must become mutable |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase grep] `src/lib/unifi/types.ts` — authoritative `NetworkClient` and `FirewallPolicy` shapes
- [VERIFIED: codebase grep] `src/lib/unifi/traffic.ts` — authoritative threshold values (1/10/100 Mbps)
- [VERIFIED: codebase grep] `src/lib/unifi/client.ts` — three function signatures the mock must match
- [VERIFIED: codebase grep] `src/app/api/clients/route.ts`, `src/app/api/firewall/route.ts` — current import paths
- [CITED: nextjs.org/docs/architecture/fast-refresh] — module-level variable reset behaviour on HMR
- [VERIFIED: codebase grep] `vitest.config.ts` — test framework, include pattern, setup file

### Secondary (MEDIUM confidence)
- [CITED: nextjs.org/docs/app/building-your-application/rendering/composition-patterns] — server-only module pattern
- [CITED: nextjs.org/docs/pages/guides/environment-variables] — unprefixed env vars are server-only in Next.js

### Tertiary (LOW confidence)
- None — all critical claims verified against codebase or official docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; existing stack fully supports requirements
- Architecture: HIGH — facade pattern is standard; module-level state behaviour verified via official Fast Refresh docs
- Pitfalls: HIGH — threshold mismatch and HMR reset are verified against actual code and docs
- Mock data values: HIGH — computed from actual `traffic.ts` threshold constants

**Research date:** 2026-04-19
**Valid until:** 2026-05-19 (stable domain — Next.js module system and TypeScript patterns do not change rapidly)
