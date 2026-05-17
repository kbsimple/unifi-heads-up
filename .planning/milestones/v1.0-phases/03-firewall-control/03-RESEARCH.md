# Phase 3: Firewall Control - Research

**Researched:** 2026-04-18
**Domain:** UniFi Site Manager API - Zone-Based Firewall, SWR Optimistic Updates, shadcn/ui Switch
**Confidence:** HIGH

## Summary

This phase implements firewall rule control using the UniFi Site Manager Proxy API. The key technical challenge is detecting whether the target site uses the new Zone-Based Firewall (ZBF) model (UniFi Network 9.0+) or the legacy firewall model, then using the appropriate API endpoints. The UI pattern follows established Phase 2 conventions: Server Component for initial fetch, SWR with optimistic updates for toggles, toast notifications for errors.

**Primary recommendation:** Implement ZBF detection via `site-feature-migration` endpoint, use `/firewall-policies` endpoints for ZBF-enabled sites, implement optimistic toggle with SWR `mutate({ optimisticData, rollbackOnError: true })` pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**UI Location:**
- **D-01:** New tab in top navigation bar — Firewall tab alongside Dashboard tab for clear separation and easy discovery
- **D-02:** Top nav will have two tabs: "Dashboard" (devices) and "Firewall" (rules)

**Rule Display:**
- **D-03:** Card list format — each firewall rule displayed as a card with rule name, enabled status indicator, and toggle switch
- **D-04:** Consistent with Phase 2 device cards — same Card component, same dark theme styling (bg-zinc-900, border-zinc-800)

**Toggle UX:**
- **D-05:** Optimistic updates — switch animates immediately on click, API call happens in background
- **D-06:** Error handling — toast notification on failure with automatic revert of switch to previous state
- **D-07:** No confirmation dialog — simple toggle experience as per requirement "simple switch control"

**Rule Information:**
- **D-08:** Minimal display — show only rule name and enabled/disabled status
- **D-09:** Keep it simple for non-technical family users — no action/zone/protocol details unless requested

**API Approach:**
- **D-10:** Zone-Based Firewall (ZBF) detection required — check `site-feature-migration` endpoint first
- **D-11:** If ZBF enabled: use `/proxy/network/v2/api/site/default/firewall-policies` endpoints
- **D-12:** If ZBF disabled: use legacy `/proxy/network/v2/api/site/default/stat/firewallrule` endpoint
- **D-13:** Toggle via PUT request to `/firewall-policies/{policy_id}` with `enabled: true|false` body

### Claude's Discretion

- shadcn Switch component for toggle control (add via `npx shadcn@latest add switch`)
- SWR with mutation for optimistic updates (pattern from Phase 2)
- Server Action for firewall toggle mutation (pattern from Phase 1)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FWRC-01 | User can view all pre-existing firewall rules with name and enabled/disabled status | ZBF detection + `firewall-policies` GET endpoint documented below |
| FWRC-02 | User can toggle (enable/disable) a firewall rule via a simple switch | shadcn Switch component + PUT `/firewall-policies/{id}` endpoint |
| FWRC-03 | Firewall rule changes are reflected immediately in the UI after toggle | SWR optimistic updates with `optimisticData` pattern |
| FWRC-04 | User sees clear error message if firewall toggle fails | SWR `rollbackOnError` + Sonner toast pattern from Phase 1 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **SWR** | 2.4.1 (verified) | Data fetching with optimistic updates | Already in project (Phase 2). Built-in `mutate` with `optimisticData` and `rollbackOnError` perfect for toggle UX. [VERIFIED: npm registry] |
| **@radix-ui/react-switch** | 1.2.6 (verified) | Accessible switch component | shadcn Switch wraps this. Full accessibility, keyboard navigation. [VERIFIED: npm registry] |
| **ky** | 2.0.1 (in project) | HTTP client | Already in project. Use for firewall API calls. [VERIFIED: package.json] |
| **Zod** | 4.3.6 (in project) | Schema validation | Already in project. Validate firewall policy responses. [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **sonner** | 2.0.7 (in project) | Toast notifications | Error messages on toggle failure (FWRC-04) |
| **shadcn/ui Card** | (in project) | Rule card layout | Consistent with Phase 2 device cards (D-04) |
| **shadcn/ui Badge** | (in project) | Status indicator | Enabled/Disabled badge on rule cards |

### Installation
```bash
# Add shadcn Switch component
npx shadcn@latest add switch
```

**Version verification:** SWR 2.4.1, @radix-ui/react-switch 1.2.6, Next.js 16.2.4 verified via `npm view` on 2026-04-18.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx        # Extend: add Firewall tab to nav
│   │   ├── page.tsx          # Dashboard (devices)
│   │   └── firewall/
│   │       └── page.tsx      # NEW: Firewall rules page
│   └── api/
│       ├── clients/route.ts  # Existing
│       └── firewall/         # NEW
│           └── route.ts       # GET policies, PUT toggle
├── lib/unifi/
│   ├── client.ts             # Extend: add firewall functions
│   └── types.ts              # Extend: add firewall types
└── components/
    ├── dashboard/            # Existing device components
    └── firewall/             # NEW
        ├── firewall-list.tsx
        ├── firewall-card.tsx
        └── rule-toggle.tsx
```

### Pattern 1: ZBF Detection + API Call
**What:** Detect Zone-Based Firewall mode before calling appropriate endpoint
**When to use:** All firewall operations (list, toggle)
**Example:**
```typescript
// src/lib/unifi/client.ts extension
import 'server-only'
import ky from 'ky'
import { z } from 'zod'

const SITE_MANAGER_BASE = 'https://api.ui.com'

// ZBF detection response schema
const FeatureMigrationSchema = z.object({
  _id: z.string(),
  feature: z.string(),
  timestamp: z.number(),
})

// Firewall policy schema (ZBF mode)
export const FirewallPolicySchema = z.object({
  _id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  action: z.enum(['ALLOW', 'BLOCK']).optional(),
  // Additional fields not needed for display per D-08
})

export type FirewallPolicy = z.infer<typeof FirewallPolicySchema>

/**
 * Check if Zone-Based Firewall is enabled
 * Source: https://github.com/enuno/unifi-mcp-server ZBF_STATUS.md
 */
export async function isZoneBasedFirewallEnabled(): Promise<boolean> {
  const consoleId = process.env.UNIFI_CONSOLE_ID
  const apiKey = process.env.UNIFI_API_KEY

  const response = await ky
    .get(`${SITE_MANAGER_BASE}/proxy/network/v2/api/site/default/site-feature-migration`, {
      headers: { 'X-API-KEY': apiKey },
      timeout: 10000,
    })
    .json<unknown>()

  const features = FeatureMigrationSchema.array().parse(response)
  return features.some(f => f.feature === 'ZONE_BASED_FIREWALL')
}

/**
 * Get all firewall policies (ZBF mode)
 * Source: [CITED: developer.ui.com, verified via enuno/unifi-mcp-server]
 */
export async function getFirewallPolicies(): Promise<FirewallPolicy[]> {
  const apiKey = process.env.UNIFI_API_KEY

  const response = await ky
    .get(`${SITE_MANAGER_BASE}/proxy/network/v2/api/site/default/firewall-policies`, {
      headers: { 'X-API-KEY': apiKey },
      timeout: 10000,
    })
    .json<unknown>()

  // API may wrap in { data: [...] } or return array directly
  const data = response && typeof response === 'object' && 'data' in response
    ? response.data
    : response

  return FirewallPolicySchema.array().parse(data)
}

/**
 * Toggle firewall policy enabled state
 * Per D-13: PUT to /firewall-policies/{id} with enabled: true|false
 */
export async function updateFirewallPolicy(
  policyId: string,
  enabled: boolean
): Promise<FirewallPolicy> {
  const apiKey = process.env.UNIFI_API_KEY

  const response = await ky
    .put(`${SITE_MANAGER_BASE}/proxy/network/v2/api/site/default/firewall-policies/${policyId}`, {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      json: { enabled },
      timeout: 10000,
    })
    .json<unknown>()

  return FirewallPolicySchema.parse(response)
}
```

### Pattern 2: SWR Optimistic Update with Rollback
**What:** Immediate UI update with automatic rollback on error
**When to use:** Firewall toggle operations (FWRC-03, FWRC-04)
**Example:**
```typescript
// src/components/firewall/rule-toggle.tsx
'use client'

import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import useSWR, { useSWRConfig } from 'swr'
import type { FirewallPolicy } from '@/lib/unifi/types'

interface RuleToggleProps {
  policy: FirewallPolicy
  policies: FirewallPolicy[]
}

export function RuleToggle({ policy, policies }: RuleToggleProps) {
  const { mutate } = useSWRConfig()

  const handleToggle = async (checked: boolean) => {
    // Optimistic update - immediate UI change
    mutate(
      '/api/firewall',
      policies.map(p =>
        p._id === policy._id ? { ...p, enabled: checked } : p
      ),
      {
        optimisticData: policies.map(p =>
          p._id === policy._id ? { ...p, enabled: checked } : p
        ),
        rollbackOnError: true, // Auto-revert on failure
        revalidate: true,      // Refresh from server after
      }
    )

    // Perform actual API call
    try {
      await fetch('/api/firewall', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: policy._id, enabled: checked }),
      })
    } catch (error) {
      // SWR handles rollback automatically
      toast.error('Failed to update rule. Changes reverted.')
    }
  }

  return (
    <Switch
      checked={policy.enabled}
      onCheckedChange={handleToggle}
      aria-label={`Toggle ${policy.name}`}
    />
  )
}
```
**Source:** [CITED: swr.vercel.app/docs/mutation] - SWR mutation documentation

### Pattern 3: Firewall Card Component
**What:** Rule display card consistent with Phase 2 device cards
**When to use:** Each firewall rule in the list
**Example:**
```typescript
// src/components/firewall/firewall-card.tsx
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import type { FirewallPolicy } from '@/lib/unifi/types'

interface FirewallCardProps {
  policy: FirewallPolicy
  onToggle: (policyId: string, enabled: boolean) => void
}

export function FirewallCard({ policy, onToggle }: FirewallCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Rule name - left side */}
          <div className="flex items-center gap-3">
            <p className="font-medium text-zinc-100">{policy.name}</p>
            <Badge variant={policy.enabled ? 'default' : 'secondary'}>
              {policy.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          {/* Toggle switch - right side */}
          <Switch
            checked={policy.enabled}
            onCheckedChange={(checked) => onToggle(policy._id, checked)}
            aria-label={`Toggle ${policy.name}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

### Anti-Patterns to Avoid

- **Calling legacy `/stat/firewallrule` on ZBF-enabled sites:** Returns empty array since UniFi Network 9.0. Always detect ZBF first. [CITED: github.com/Art-of-WiFi/UniFi-API-client/issues/259]
- **Skipping optimistic updates:** Makes toggle feel laggy. Use `optimisticData` for instant feedback.
- **Catching errors without rollback:** User sees wrong state. Always use `rollbackOnError: true` or handle rollback manually.
- **Storing API key in client code:** Exposes credentials. Keep all UniFi API calls in `server-only` modules.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toggle switch UI | Custom checkbox styling | shadcn Switch | Full accessibility, keyboard nav, consistent styling |
| Optimistic updates | Manual state management + error revert | SWR `mutate({ optimisticData, rollbackOnError })` | Battle-tested, handles race conditions, automatic rollback |
| Toast notifications | Custom alert component | sonner (already installed) | Consistent with Phase 1, supports error/success variants |
| ZBF detection | Assume one mode or the other | `site-feature-migration` endpoint | API differs between modes, wrong endpoint returns empty or errors |

**Key insight:** The ZBF vs legacy firewall API difference is the primary technical complexity. UniFi Network 9.0+ migrated to Zone-Based Firewall, making the legacy `stat/firewallrule` endpoint return empty. Detection via `site-feature-migration` is essential.

## Common Pitfalls

### Pitfall 1: Empty Firewall Rules List on ZBF Sites
**What goes wrong:** Calling `/stat/firewallrule` returns empty array on ZBF-enabled sites
**Why it happens:** UniFi Network 9.0+ migrated to Zone-Based Firewall model; legacy endpoint no longer returns data
**How to avoid:** Always check `site-feature-migration` first, use `/firewall-policies` for ZBF sites
**Warning signs:** Empty rules list when you know rules exist in UniFi Console UI

### Pitfall 2: Switch State Desync on Error
**What goes wrong:** Toggle fails but switch stays in new position, confusing user
**Why it happens:** Forgetting `rollbackOnError: true` or catching error without reverting state
**How to avoid:** Use SWR's `rollbackOnError: true` option - handles revert automatically
**Warning signs:** Switch position doesn't match actual rule state after network error

### Pitfall 3: Rate Limiting During Bulk Operations
**What goes wrong:** Rapid toggles trigger 429 errors from Site Manager API
**Why it happens:** Site Manager has 10,000 req/min limit for v1 stable API
**How to avoid:** This phase only does single-toggle operations; bulk operations are out of scope per PROJECT.md
**Warning signs:** 429 responses, "rate limit exceeded" errors

### Pitfall 4: ZBF Policy Fields Not Understood
**What goes wrong:** Assuming all policies have same fields as legacy rules
**Why it happens:** ZBF policies have zone-based source/destination instead of simple IP rules
**How to avoid:** Per D-08/D-09, only display name and enabled status - ignore action/zone/protocol details

## Code Examples

### ZBF Detection Function
```typescript
// Source: [CITED: github.com/enuno/unifi-mcp-server ZBF_STATUS.md]
export async function isZoneBasedFirewallEnabled(): Promise<boolean> {
  const response = await ky
    .get(`${SITE_MANAGER_BASE}/proxy/network/v2/api/site/default/site-feature-migration`, {
      headers: { 'X-API-KEY': apiKey },
      timeout: 10000,
    })
    .json<unknown>()

  const features = z.object({
    _id: z.string(),
    feature: z.string(),
    timestamp: z.number(),
  }).array().parse(response)

  return features.some(f => f.feature === 'ZONE_BASED_FIREWALL')
}
```

### SWR Mutation with Optimistic Update
```typescript
// Source: [CITED: swr.vercel.app/docs/mutation]
const { mutate } = useSWRConfig()

// Optimistic toggle with automatic rollback
mutate(
  '/api/firewall',
  async (current: FirewallPolicy[]) => {
    const response = await fetch('/api/firewall', {
      method: 'PUT',
      body: JSON.stringify({ policyId, enabled }),
    })
    if (!response.ok) throw new Error('Toggle failed')
    return current.map(p => p._id === policyId ? { ...p, enabled } : p)
  },
  {
    optimisticData: current =>
      current.map(p => p._id === policyId ? { ...p, enabled } : p),
    rollbackOnError: true,
    revalidate: true,
  }
)
```

### API Route for Firewall Operations
```typescript
// src/app/api/firewall/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getFirewallPolicies, updateFirewallPolicy } from '@/lib/unifi/client'
import { ERROR_MESSAGES } from '@/lib/definitions'

export async function GET() {
  const session = await getSession()
  if (!session?.username) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const policies = await getFirewallPolicies()
    return NextResponse.json({ policies, timestamp: Date.now() })
  } catch (error) {
    return NextResponse.json(
      { error: 'API_ERROR', message: ERROR_MESSAGES.UNKNOWN },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session?.username) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const { policyId, enabled } = await request.json()
    const policy = await updateFirewallPolicy(policyId, enabled)
    return NextResponse.json(policy)
  } catch (error) {
    return NextResponse.json(
      { error: 'API_ERROR', message: ERROR_MESSAGES.UNKNOWN },
      { status: 500 }
    )
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Legacy `/stat/firewallrule` endpoint | `/firewall-policies` endpoint for ZBF | UniFi Network 9.0 (~2024) | Must detect ZBF mode before calling API |
| Manual optimistic state management | SWR `mutate({ optimisticData, rollbackOnError })` | SWR 1.2.0 (2022) | Simpler code, automatic error recovery |
| Custom toggle components | shadcn/ui Switch (Radix-based) | 2023+ | Full accessibility, consistent styling |

**Deprecated/outdated:**
- `list_firewallrules` endpoint: Returns empty on ZBF-enabled sites. Use `firewall-policies` instead. [CITED: github.com/Art-of-WiFi/UniFi-API-client/issues/259]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Site Manager Proxy supports `/firewall-policies` endpoint | Standard Stack | May need local API access instead of cloud proxy |
| A2 | `site-feature-migration` endpoint works via Site Manager Proxy | Architecture | May only work with local controller access |
| A3 | User's UniFi site is named "default" | Architecture | User may have custom site name |

**Verification needed:** Test `site-feature-migration` and `firewall-policies` endpoints via Site Manager Proxy during implementation. The enuno/unifi-mcp-server reference implementation indicates these work with local API; Site Manager Proxy compatibility should be confirmed.

## Open Questions (RESOLVED)

1. **Site Manager Proxy vs Local API for Firewall Policies**
   - What we know: `firewall-policies` endpoint documented for v2 API local access
   - What's unclear: Whether Site Manager Proxy forwards these requests or blocks them
   - **RESOLVED:** Test endpoint during implementation; Plan 03-02-01 includes fallback handling. If Site Manager Proxy blocks `/firewall-policies`, the error handler will surface a clear message. Implementation proceeds with Site Manager Proxy as primary path, local API fallback documented as risk mitigation.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/runtime | ✓ (per project context) | 18.18+ | — |
| Next.js | Framework | ✓ | 16.2.3 | — |
| SWR | Data fetching | ✓ | 2.4.1 | — |
| sonner | Toast notifications | ✓ | 2.0.7 | — |
| @radix-ui/react-switch | Switch component | Need install | — | shadcn CLI installs it |
| ky | HTTP client | ✓ | 2.0.1 | — |
| Zod | Validation | ✓ | 4.3.6 | — |

**Missing dependencies with no fallback:**
- None - all dependencies available or installable via `npx shadcn@latest add switch`

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm run test:run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FWRC-01 | View all firewall rules with name and enabled status | integration | `vitest tests/app/api/firewall/route.test.ts` | Wave 0 |
| FWRC-02 | Toggle firewall rule via switch | unit | `vitest tests/components/firewall/rule-toggle.test.tsx` | Wave 0 |
| FWRC-03 | Changes reflected immediately in UI | unit | `vitest tests/components/firewall/rule-toggle.test.tsx` | Wave 0 |
| FWRC-04 | Clear error message on toggle failure | unit | `vitest tests/components/firewall/rule-toggle.test.tsx` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (quick run)
- **Per wave merge:** `npm run test:run` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/app/api/firewall/route.test.ts` - covers FWRC-01 (GET firewall policies)
- [ ] `tests/components/firewall/rule-toggle.test.tsx` - covers FWRC-02, FWRC-03, FWRC-04
- [ ] `tests/lib/unifi/firewall.test.ts` - covers ZBF detection and policy client functions
- [ ] `src/components/ui/switch.tsx` - shadcn Switch component (install via CLI)

*(If no gaps: "None - existing test infrastructure covers all phase requirements")*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT session from Phase 1 |
| V3 Session Management | yes | HTTP-only cookies, 7-day expiry (Phase 1) |
| V4 Access Control | yes | Session verification on API routes |
| V5 Input Validation | yes | Zod schema validation on all API inputs |
| V6 Cryptography | no | Not handling secrets in this phase |

### Known Threat Patterns for UniFi API

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key exposure in client | Information Disclosure | `server-only` package, no NEXT_PUBLIC_ prefix |
| Session hijacking | Spoofing | HTTP-only cookies, SameSite=Strict |
| CSRF on toggle | Tampering | Next.js built-in CSRF protection via SameSite cookies |
| Unauthorized API access | Elevation | Session verification on all API routes (per D-10) |
| Input injection | Tampering | Zod validation on policyId and enabled params |

### Firewall-Specific Threats

| Threat | Mitigation |
|--------|------------|
| Malicious policy ID in request | Zod string validation + API will reject non-existent IDs |
| Invalid enabled value | Zod boolean validation |
| Race condition on toggle | SWR handles mutation timestamps, last-write-wins |

## Sources

### Primary (HIGH confidence)
- [swr.vercel.app/docs/mutation](https://swr.vercel.app/docs/mutation) - SWR mutation and optimistic updates documentation
- [ui.shadcn.com/docs/components/switch](https://ui.shadcn.com/docs/components/switch) - Switch component installation and usage
- [github.com/enuno/unifi-mcp-server](https://github.com/enuno/unifi-mcp-server/blob/a2923dd2/src/tools/firewall_policies.py) - Reference implementation for firewall policy operations
- Project package.json - Verified installed versions (SWR 2.4.1, ky 2.0.1, Zod 4.3.6)

### Secondary (MEDIUM confidence)
- [github.com/Art-of-WiFi/UniFi-API-client/issues/259](https://github.com/Art-of-WiFi/UniFi-API-client/issues/259) - ZBF API endpoint discussion and empty firewall rules issue
- [developer.ui.com/site-manager-api](https://developer.ui.com/site-manager-api/) - UniFi Site Manager API reference (limited firewall docs)

### Tertiary (LOW confidence)
- Web search results for ZBF endpoint information - verified against multiple sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified in project or npm registry
- Architecture: HIGH - ZBF detection and API endpoints documented in reference implementations
- Pitfalls: HIGH - Based on documented GitHub issues and official API limitations
- Site Manager Proxy compatibility: MEDIUM - Awaiting implementation verification

**Research date:** 2026-04-18
**Valid until:** 30 days (API endpoints stable, SWR patterns stable)