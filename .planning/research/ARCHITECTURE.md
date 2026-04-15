# Architecture Research

**Domain:** Next.js application with external API integration (Unifi Site Manager)
**Researched:** 2026-04-14
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │  Server         │  │  Client         │  │  Layouts                │ │
│  │  Components     │  │  Components     │  │  (dashboard, auth)      │ │
│  │  (data fetch)   │  │  (interactivity)│  │                         │ │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────────────┘ │
│           │                    │                                        │
│           │                    │                                        │
├───────────┴────────────────────┴────────────────────────────────────────┤
│                           APPLICATION LAYER                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │  Server Actions │  │  Route Handlers │  │  Auth Layer            │ │
│  │  (mutations)    │  │  (API routes)   │  │  (Auth.js v5)          │ │
│  └────────┬────────┘  └────────┬────────┘  └───────────┬─────────────┘ │
│           │                    │                       │               │
├───────────┴────────────────────┴───────────────────────┴───────────────┤
│                           SERVICE LAYER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Unifi API Client                              │   │
│  │  - Token management    - Rate limiting    - Error handling      │   │
│  │  - Request retry       - Response transformation                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│           │                                                              │
├───────────┴─────────────────────────────────────────────────────────────┤
│                           EXTERNAL SERVICES                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                               │
│  │  Site Manager   │  │  Unifi OS      │                               │
│  │  Proxy API      │  │  Console       │                               │
│  │  (api.ui.com)    │  │  (local)       │                               │
│  └─────────────────┘  └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Server Components | Fetch and render data server-side, SEO-critical pages | `async function` components with direct data fetching |
| Client Components | Interactive UI elements, polling, user input | Components marked with `'use client'` |
| Route Handlers | API endpoints for webhooks, external integrations | `app/api/*/route.ts` with GET/POST/PUT/DELETE exports |
| Server Actions | Mutations triggered from UI (form submissions, toggles) | `'use server'` exported async functions |
| Service Layer | External API client abstraction, business logic | Classes/functions in `lib/services/` |
| Auth Layer | Authentication, session management, authorization | Auth.js v5 with middleware and session utilities |
| Data Access Layer | Authorized data fetching with caching | `lib/dal/` with React `cache()` and `server-only` |

## Recommended Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group for auth pages
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx            # Minimal auth layout
│   ├── (dashboard)/              # Route group for authenticated pages
│   │   ├── clients/
│   │   │   └── page.tsx          # Device/clients list view
│   │   ├── groups/
│   │   │   └── page.tsx          # Device groups view
│   │   ├── firewall/
│   │   │   └── page.tsx          # Firewall rule toggles
│   │   └── layout.tsx            # Dashboard layout with nav
│   ├── api/                      # Route Handlers (minimal)
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts  # Auth.js handler
│   │   └── webhooks/            # External webhooks if needed
│   ├── actions/                  # Server Actions
│   │   ├── firewall.ts           # Toggle firewall rules
│   │   └── auth.ts               # Auth-related actions
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home/redirect
│   ├── loading.tsx               # Loading states
│   └── error.tsx                 # Error boundaries
├── components/
│   ├── ui/                       # Primitive UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── skeleton.tsx
│   └── features/                 # Domain-specific components
│       ├── traffic-status.tsx    # Traffic indicator (high/med/low/idle)
│       ├── client-list.tsx       # Device list with status
│       └── firewall-toggle.tsx   # Rule enable/disable toggle
├── lib/
│   ├── auth.ts                   # Auth.js configuration
│   ├── dal/                      # Data Access Layer
│   │   ├── clients.ts            # Client device queries
│   │   ├── firewall.ts           # Firewall rule queries
│   │   └── index.ts              # Export and utilities
│   ├── services/                 # External API clients
│   │   ├── unifi-client.ts       # Site Manager API client
│   │   └── rate-limiter.ts       # Rate limiting utility
│   └── utils/                    # Shared utilities
│       ├── cn.ts                 # Class name utility
│       └── format.ts             # Data formatting
├── hooks/                        # Client-side hooks
│   ├── use-polling.ts            # Polling hook for traffic data
│   └── use-traffic-status.ts     # Traffic status calculation
└── types/                        # TypeScript definitions
    ├── unifi.ts                  # Unifi API types
    └── next-auth.d.ts            # Auth.js type extensions
```

### Structure Rationale

- **Route Groups `(auth)` and `(dashboard)`:** Separate layouts without affecting URLs - auth pages have minimal chrome, dashboard has navigation
- **Server Actions in `app/actions/`:** Collected separately for mutations, easier to audit security
- **Minimal `api/` directory:** Only for Auth.js handler and potential webhooks - Server Actions replace most API routes
- **`lib/dal/` for data access:** Encapsulates Unifi API calls with authorization checks and caching
- **`lib/services/` for API client:** Abstracts Site Manager Proxy communication, handles auth tokens, rate limits

## Architectural Patterns

### Pattern 1: Backend-for-Frontend (BFF)

**What:** Route handlers act as a proxy layer between frontend and external APIs, keeping secrets server-side and providing a stable internal contract.

**When to use:** Always for external API integrations - never expose API keys to the browser.

**Trade-offs:**
- Pro: Security (secrets stay server-side), response normalization, centralized error handling
- Con: Additional network hop, more code to maintain

**Example:**
```typescript
// lib/services/unifi-client.ts
import 'server-only'

const SITE_MANAGER_API = 'https://api.ui.com'

interface UnifiClientConfig {
  apiKey: string
  siteId: string
}

export class UnifiClient {
  private config: UnifiClientConfig
  private rateLimiter: RateLimiter

  constructor(config: UnifiClientConfig) {
    this.config = config
    this.rateLimiter = new RateLimiter(100) // 100 req/min
  }

  async getClients(): Promise<UnifiClient[]> {
    return this.rateLimiter.execute(async () => {
      const response = await fetch(
        `${SITE_MANAGER_API}/sites/${this.config.siteId}/clients`,
        {
          headers: { 'x-api-key': this.config.apiKey },
          signal: AbortSignal.timeout(8000),
        }
      )
      if (!response.ok) throw new UnifiApiError(response.status, 'Failed to fetch clients')
      return response.json()
    })
  }

  async toggleFirewallRule(ruleId: string, enabled: boolean): Promise<void> {
    return this.rateLimiter.execute(async () => {
      const response = await fetch(
        `${SITE_MANAGER_API}/sites/${this.config.siteId}/firewall/rules/${ruleId}`,
        {
          method: 'PATCH',
          headers: {
            'x-api-key': this.config.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled }),
          signal: AbortSignal.timeout(8000),
        }
      )
      if (!response.ok) throw new UnifiApiError(response.status, 'Failed to toggle rule')
    })
  }
}

// Singleton with request-scoped config
export function getUnifiClient(): UnifiClient {
  const apiKey = process.env.UNIFI_API_KEY
  const siteId = process.env.UNIFI_SITE_ID
  if (!apiKey || !siteId) throw new Error('Missing Unifi configuration')
  return new UnifiClient({ apiKey, siteId })
}
```

### Pattern 2: Data Access Layer (DAL)

**What:** A dedicated layer that handles data fetching with authorization, caching, and request memoization built in.

**When to use:** All server-side data fetching - prevents direct database/API access from components.

**Trade-offs:**
- Pro: Consistent authorization, automatic caching, type-safe responses
- Con: Additional abstraction layer

**Example:**
```typescript
// lib/dal/clients.ts
import 'server-only'
import { cache } from 'react'
import { getUnifiClient } from '@/lib/services/unifi-client'
import { auth } from '@/lib/auth'

// Request-scoped caching with React cache()
export const getClients = cache(async () => {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const client = getUnifiClient()
  const clients = await client.getClients()

  // Transform to minimal DTO
  return clients.map(c => ({
    id: c.id,
    name: c.name || c.hostname || 'Unknown',
    mac: c.mac,
    traffic: {
      tx: c.tx_bytes || 0,
      rx: c.rx_bytes || 0,
    },
    lastSeen: c.last_seen,
  }))
})

// lib/dal/firewall.ts
import 'server-only'
import { cache } from 'react'
import { getUnifiClient } from '@/lib/services/unifi-client'
import { auth } from '@/lib/auth'

export const getFirewallRules = cache(async () => {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const client = getUnifiClient()
  const rules = await client.getFirewallRules()

  return rules.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    enabled: r.enabled,
    target: r.target_devices,
  }))
})
```

### Pattern 3: Server Actions for Mutations

**What:** Server-side functions called directly from components for mutations, with automatic revalidation.

**When to use:** Form submissions, toggles, any data mutation from the UI.

**Trade-offs:**
- Pro: Type-safe, automatic CSRF protection, progressive enhancement
- Con: POST-only, not cacheable, coupled to Next.js

**Example:**
```typescript
// app/actions/firewall.ts
'use server'

import { auth } from '@/lib/auth'
import { getUnifiClient } from '@/lib/services/unifi-client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const toggleSchema = z.object({
  ruleId: z.string(),
  enabled: z.boolean(),
})

export async function toggleFirewallRule(formData: FormData) {
  // 1. Authenticate
  const session = await auth()
  if (!session?.user) {
    return { error: 'Unauthorized' }
  }

  // 2. Validate input
  const result = toggleSchema.safeParse({
    ruleId: formData.get('ruleId'),
    enabled: formData.get('enabled') === 'true',
  })
  if (!result.success) {
    return { error: 'Invalid input' }
  }

  // 3. Execute
  try {
    const client = getUnifiClient()
    await client.toggleFirewallRule(result.data.ruleId, result.data.enabled)

    // 4. Revalidate cache
    revalidatePath('/firewall')

    return { success: true }
  } catch (error) {
    return { error: 'Failed to toggle rule' }
  }
}
```

### Pattern 4: Polling for Client-Side Updates

**What:** Client-side hook that periodically refreshes server-rendered data.

**When to use:** Real-time-ish data like traffic status where 5-minute averages are sufficient.

**Trade-offs:**
- Pro: Simple implementation, works with Server Components
- Con: Not truly real-time, creates load on server

**Example:**
```typescript
// hooks/use-polling.ts
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function usePolling(intervalMs: number, enabled: boolean = true) {
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) return

    intervalRef.current = setInterval(() => {
      router.refresh() // Re-fetches server component data
    }, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [intervalMs, enabled, router])
}

// Usage in component
// app/(dashboard)/clients/page.tsx
'use client'

import { usePolling } from '@/hooks/use-polling'

export default function ClientsPage() {
  usePolling(30000) // Refresh every 30 seconds

  return <ClientList />
}
```

## Data Flow

### Request Flow

```
[User views clients page]
         ↓
[Server Component: clients/page.tsx]
         ↓
[DAL: getClients()] → [Auth check] → [UnifiClient.getClients()]
         ↓                                      ↓
[Render HTML with data]                  [Site Manager Proxy API]
         ↓                                      ↓
[Client receives HTML]                   [api.ui.com response]
         ↓
[Client Component: usePolling(30000)]
         ↓ (every 30s)
[router.refresh()] → Triggers server re-render
```

### Mutation Flow

```
[User clicks firewall toggle]
         ↓
[Client Component: captures click]
         ↓
[Form submission to Server Action]
         ↓
[toggleFirewallRule(formData)]
         ↓
[Auth check] → [Validate input] → [UnifiClient.toggleFirewallRule()]
         ↓                                      ↓
[revalidatePath('/firewall')]            [Site Manager Proxy API]
         ↓
[Server re-renders with updated data]
```

### Key Data Flows

1. **Traffic Status Fetch:** Server Component → DAL → UnifiClient → Site Manager API → Render
2. **Firewall Toggle:** Client Component → Server Action → UnifiClient → Site Manager API → Revalidate
3. **Authentication:** Middleware → Auth.js → Session check → Redirect or continue
4. **Polling Refresh:** Client hook → router.refresh() → Server Component re-executes

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Family household (current) | Monolith on Vercel is ideal - simple, fast, sufficient |
| Extended family (10-20 users) | Add response caching, consider ISR for semi-static data |
| Community (100+ users) | Add Redis for rate limit coordination, consider dedicated API gateway |

### Scaling Priorities

1. **First bottleneck:** Site Manager API rate limits (10,000 req/min for v1 stable)
   - Mitigation: Aggressive client-side caching, ISR for device lists
2. **Second bottleneck:** Vercel serverless function timeout (10s hobby, 60s pro)
   - Mitigation: Move long operations to background jobs if needed

## Anti-Patterns

### Anti-Pattern 1: Client-Side External API Calls

**What people do:** Call `api.ui.com` directly from client components.

**Why it's wrong:** Exposes API keys in browser, triggers CORS errors, no rate limit control.

**Do this instead:** Always use Route Handlers or Server Actions as proxies. API keys stay server-side in environment variables.

### Anti-Pattern 2: Missing Timeouts

**What people do:** Fetch external APIs without timeout configuration.

**Why it's wrong:** Requests hang indefinitely, exhaust serverless function time, poor UX.

**Do this instead:** Always set timeouts with `AbortSignal.timeout(8000)` or AbortController.

### Anti-Pattern 3: Authentication in Middleware Only

**What people do:** Rely solely on middleware for route protection.

**Why it's wrong:** CVE-2025-29927 showed middleware bypass vulnerabilities. Defense-in-depth is required.

**Do this instead:** Verify authentication in every Server Action and DAL function, not just middleware.

### Anti-Pattern 4: Over-Fetching from External API

**What people do:** Return full Unifi API responses to client components.

**Why it's wrong:** Exposes unnecessary data, increases payload size, potential security issues.

**Do this instead:** Transform responses in DAL to minimal DTOs with only needed fields.

### Anti-Pattern 5: Stale Data After Mutations

**What people do:** Mutate data via Server Actions but forget to revalidate.

**Why it's wrong:** UI shows stale data after successful operations.

**Do this instead:** Always call `revalidatePath()` or `revalidateTag()` after mutations.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Site Manager Proxy (`api.ui.com`) | UnifiClient in service layer | Rate limits: 10k req/min, requires API key |
| Auth.js v5 | Middleware + session utilities | JWT sessions recommended for serverless |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Server Components ↔ DAL | Direct function calls | Request-scoped with React cache() |
| Client Components ↔ Server Actions | Form submission / useServerAction | Type-safe, automatic revalidation |
| DAL ↔ Service Layer | Direct function calls | Services are singletons |
| Service Layer ↔ External API | HTTP fetch | Rate-limited, timeout-configured |

## Build Order Implications

Based on dependencies between components, suggested implementation order:

### Phase 1: Foundation
1. **Project structure** - Set up folder organization
2. **Service Layer** - UnifiClient with auth and rate limiting
3. **Auth Layer** - Auth.js v5 with credentials provider

**Rationale:** Service layer must exist before DAL can function. Auth must work before protected routes.

### Phase 2: Read Operations
1. **DAL functions** - getClients, getFirewallRules
2. **Server Components** - Dashboard pages that display data
3. **UI components** - Primitive and feature components

**Rationale:** DAL depends on service layer. Components depend on DAL for data.

### Phase 3: Write Operations
1. **Server Actions** - toggleFirewallRule
2. **Interactive components** - Toggle switches, forms
3. **Polling** - Real-time-ish updates for traffic

**Rationale:** Mutations depend on existing read paths. Polling depends on data display working.

### Phase 4: Polish
1. **Error boundaries** - Graceful failure handling
2. **Loading states** - Skeletons and Suspense
3. **Caching optimization** - Revalidation strategies

**Rationale:** These are cross-cutting concerns that build on working core functionality.

## Sources

- [Next.js Data Fetching Patterns](https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns) - HIGH confidence (official docs)
- [Next.js App Router Project Structure](https://www.buttercups.tech/blog/react/nextjs-app-router-project-structure-best-practices-guide) - MEDIUM confidence (community guide)
- [How I Structure Real-World Next.js Apps](https://medium.com/@vigneshuthra/how-i-structure-real-world-next-js-apps-using-the-app-router-2025-edition-58a5c8f447fb) - MEDIUM confidence (experienced developer)
- [Server Actions vs API Routes](https://unanswered.io/guide/server-actions-vs-api-routes-nextjs) - HIGH confidence (clear technical distinction)
- [Next.js Authentication Guide 2026](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) - HIGH confidence (auth provider, comprehensive)
- [Auth.js v5 with Next.js 16](https://dev.to/huangyongshan46a11y/authjs-v5-with-nextjs-16-the-complete-authentication-guide-2026-2lg) - HIGH confidence (official patterns)
- [Building a Scalable API Layer in Next.js](https://medium.com/codetodeploy/building-a-scalable-api-layer-in-next-js-best-practices-a0ca15216fb6) - MEDIUM confidence (practical guide)
- [TanStack Query with Next.js App Router](https://noqta.tn/en/tutorials/tanstack-query-v5-nextjs-data-fetching-guide-2026) - MEDIUM confidence (comprehensive tutorial)
- [Next.js Polling Patterns](https://dev.to/whoffagents/real-time-features-in-nextjs-sse-polling-and-websockets-without-a-separate-server-2k3b) - MEDIUM confidence (practical patterns)
- [Handling API Rate Limiting in Next.js](https://medium.com/@mohantaankit2002/handling-api-rate-limiting-in-next-js-best-practices-for-reliable-integrations-794721ef326b) - MEDIUM confidence (best practices)

---
*Architecture research for: Unifi Network Dashboard with external Site Manager API*
*Researched: 2026-04-14*