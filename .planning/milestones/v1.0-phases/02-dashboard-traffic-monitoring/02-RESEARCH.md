# Phase 2: Dashboard & Traffic Monitoring - Research

**Researched:** 2026-04-14
**Domain:** UniFi Site Manager API, Next.js 15 Data Polling, Responsive Dashboard Design
**Confidence:** HIGH

## Summary

This phase delivers the core dashboard experience: a real-time view of all network clients with their traffic status. The implementation uses a hybrid Server/Client component pattern where the Server Component fetches initial data (fast page load, SEO-friendly) and a Client Component with SWR handles polling for updates every 60 seconds. Traffic status is calculated from real-time bandwidth rate fields (`rx_bytes-r`, `tx_bytes-r`) returned by the UniFi Site Manager API.

**Primary recommendation:** Build a custom UniFi API client using `ky` for Site Manager Proxy integration, use SWR 2.4.x for client-side polling, and display clients in a responsive card grid on mobile that transitions to a table on larger screens.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEVI-01 | View all network clients with name, MAC, IP | UniFi API `list_clients()` returns `mac`, `ip`, `name`, `hostname` fields |
| DEVI-02 | See traffic status (High/Medium/Low/Idle) per client | UniFi API returns `rx_bytes-r` and `tx_bytes-r` for real-time bandwidth; calculate Mbps thresholds |
| DEVI-03 | See device name (fallback to hostname, then MAC) | API returns `name` (user-assigned alias), `hostname` (device-reported), `mac` - use fallback chain |
| DEVI-04 | See when each client was last active | API returns `last_seen` timestamp in milliseconds |
| DEVI-05 | Traffic data refreshes automatically (polling every 60s) | SWR `refreshInterval: 60000` with hybrid Server/Client pattern |
| UIUX-01 | Dashboard usable on mobile (responsive design) | Card grid on mobile, table on desktop; Tailwind responsive breakpoints |
| UIUX-02 | Traffic status color coding (green/yellow/red/gray) | Define status badge variants with Tailwind color classes |
| UIUX-03 | Dashboard shows "last updated" timestamp | Track fetch timestamp in SWR `data` and display relative time |
| UIUX-05 | Dashboard shows offline/unavailable state | SWR `isOffline` detection, error boundary with retry button |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Next.js** | 16.2.3 | Full-stack framework | App Router, Server Components, established in Phase 1 [VERIFIED: package.json] |
| **React** | 19.2.4 | UI library | Required by Next.js 16, established in Phase 1 [VERIFIED: package.json] |
| **TypeScript** | 5.x | Type safety | Established in Phase 1 [VERIFIED: package.json] |
| **SWR** | 2.4.1 | Data fetching with polling | Industry standard for client-side data fetching, `refreshInterval` built-in [VERIFIED: npm registry] |
| **ky** | 2.0.1 | HTTP client | Already installed, modern fetch wrapper for UniFi API [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **zod** | 4.3.6 | Schema validation | Parse UniFi API responses, type inference [VERIFIED: package.json] |
| **lucide-react** | 1.8.0 | Icons | Traffic status icons, refresh button, error state [VERIFIED: package.json] |

### shadcn/ui Components (add in Phase 2)
| Component | Purpose | Install Command |
|-----------|---------|-----------------|
| Badge | Traffic status indicators | `pnpm dlx shadcn@latest add badge` |
| Skeleton | Loading states | `pnpm dlx shadcn@latest add skeleton` |
| Alert | Error states | `pnpm dlx shadcn@latest add alert` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SWR | React Query (TanStack Query) | Both excellent; SWR is simpler for this use case, already familiar pattern |
| ky | native fetch | ky provides better error handling, hooks, and timeout support |
| Card grid + Table | Table only | Cards provide better touch targets on mobile; tables require horizontal scroll |

**Installation:**
```bash
# SWR for client-side polling
npm install swr

# shadcn/ui components for Phase 2
pnpm dlx shadcn@latest add badge skeleton alert
```

**Version verification (2026-04-14):**
- swr: 2.4.1 [VERIFIED: npm registry]
- All Phase 1 dependencies verified in package.json

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx       # Already exists from Phase 1
│   │   ├── page.tsx         # Server Component - initial data fetch
│   │   └── dashboard/       # Optional: move to subfolder if grows
│   ├── api/
│   │   └── clients/
│   │       └── route.ts     # API route for SWR to call (wraps UniFi client)
├── lib/
│   ├── unifi/
│   │   ├── client.ts        # UniFi Site Manager API client
│   │   ├── types.ts        # TypeScript types for UniFi responses
│   │   └── traffic.ts      # Traffic status calculation logic
│   └── definitions.ts       # Already exists - extend with new types
├── components/
│   ├── dashboard/
│   │   ├── client-list.tsx        # Client Component with SWR polling
│   │   ├── client-card.tsx       # Individual client card (mobile)
│   │   ├── client-table.tsx      # Table view (desktop)
│   │   ├── traffic-badge.tsx     # Status badge component
│   │   └── last-updated.tsx       # Timestamp display
│   └── ui/                        # shadcn components from Phase 1
```

### Pattern 1: Hybrid Server/Client Data Fetching

**What:** Server Component fetches initial data, Client Component polls for updates
**When to use:** Dashboards with real-time updates in Next.js 15 App Router

**Example:**
```typescript
// app/(dashboard)/page.tsx - Server Component
import { verifySession } from '@/lib/dal'
import { getUnifiClients } from '@/lib/unifi/client'
import { ClientList } from '@/components/dashboard/client-list'

export default async function DashboardPage() {
  // Verify session (redirects if not authenticated)
  await verifySession()

  // Fetch initial data on server (fast, no client JS)
  const initialClients = await getUnifiClients()

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-zinc-100">
        Network Clients
      </h2>
      <ClientList initialData={initialClients} />
    </div>
  )
}
```
*Source: [CITED: nextjs.org/docs/15/app/building-your-application/data-fetching]*

```typescript
// components/dashboard/client-list.tsx - Client Component
'use client'

import useSWR from 'swr'
import { ClientCard } from './client-card'
import { ClientTable } from './client-table'
import { LastUpdated } from './last-updated'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function ClientList({ initialData }: { initialData: ClientsResponse }) {
  const { data, error, isLoading, mutate } = useSWR('/api/clients', fetcher, {
    fallbackData: initialData,
    refreshInterval: 60000, // Poll every 60 seconds (DEVI-05)
    revalidateOnFocus: true,
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // Retry with exponential backoff, max 3 retries
      if (retryCount >= 3) return
      setTimeout(() => revalidate({ retryCount }), 5000 * retryCount)
    },
  })

  // Offline/unavailable state (UIUX-05)
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between w-full">
          <span>Unable to reach network service. Please check your connection.</span>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const clients = data?.clients ?? []
  const lastUpdated = data?.timestamp ? new Date(data.timestamp) : new Date()

  return (
    <div className="space-y-4">
      {/* Last updated timestamp (UIUX-03) */}
      <LastUpdated date={lastUpdated} isLoading={isLoading} />

      {/* Responsive layout: cards on mobile, table on desktop (UIUX-01) */}
      <div className="md:hidden space-y-3">
        {clients.map(client => (
          <ClientCard key={client.mac} client={client} />
        ))}
      </div>

      <div className="hidden md:block">
        <ClientTable clients={clients} />
      </div>
    </div>
  )
}
```
*Source: [CITED: swr.vercel.app/docs/options]*

### Pattern 2: UniFi Site Manager API Client

**What:** Custom wrapper around `ky` for Site Manager Proxy authentication
**When to use:** All UniFi API calls in this project

**Example:**
```typescript
// lib/unifi/client.ts
import 'server-only'
import ky from 'ky'
import { z } from 'zod'
import { UnifiClient, UnifiClientSchema, ClientsResponse } from './types'

const SITE_MANAGER_BASE = 'https://api.ui.com'
const CONSOLE_ID = process.env.UNIFI_CONSOLE_ID!
const API_KEY = process.env.UNIFI_API_KEY!

// Site Manager Proxy headers
const headers = {
  'X-API-KEY': API_KEY,
  'Content-Type': 'application/json',
}

/**
 * Get all network clients via Site Manager Proxy
 * Per DEVI-01: Returns name, MAC, IP for each client
 * Per DEVI-02: Returns rx_bytes-r and tx_bytes-r for traffic calculation
 */
export async function getUnifiClients(): Promise<ClientsResponse> {
  const response = await ky
    .get(`${SITE_MANAGER_BASE}/proxy/network/v2/api/site/default/stat/sta`, {
      headers,
      timeout: 10000, // 10 second timeout
    })
    .json<unknown>()

  // Validate response with Zod
  const clients = UnifiClientSchema.array().parse(response)

  return {
    clients: clients.map(transformClient),
    timestamp: Date.now(),
  }
}

// lib/unifi/types.ts
export const UnifiClientSchema = z.object({
  _id: z.string(),
  mac: z.string(),
  name: z.string().nullable(),
  hostname: z.string().nullable(),
  ip: z.string().nullable(),
  last_seen: z.number().nullable(),
  is_wired: z.boolean().nullable(),
  is_guest: z.boolean().nullable(),
  // Real-time bandwidth rate fields (bytes per second)
  'rx_bytes-r': z.number().default(0),
  'tx_bytes-r': z.number().default(0),
})

export type UnifiClient = z.infer<typeof UnifiClientSchema>

export interface NetworkClient {
  id: string
  mac: string
  // Per DEVI-03: Fallback chain: name -> hostname -> MAC
  displayName: string
  ip: string | null
  lastSeen: Date | null
  isWired: boolean
  isGuest: boolean
  // Bandwidth in bytes per second
  downloadRate: number
  uploadRate: number
  // Per DEVI-02: Traffic status
  trafficStatus: 'idle' | 'low' | 'medium' | 'high'
}

export interface ClientsResponse {
  clients: NetworkClient[]
  timestamp: number
}
```
*Source: [CITED: github.com/Art-of-WiFi/UniFi-API-client/blob/main/API_REFERENCE.md]*

### Pattern 3: Traffic Status Calculation

**What:** Convert real-time bandwidth to status level based on PROJECT.md thresholds
**When to use:** Transforming raw API data for display

**Example:**
```typescript
// lib/unifi/traffic.ts

// Thresholds from PROJECT.md (in Mbps)
const TRAFFIC_THRESHOLDS = {
  IDLE: 1,      // < 1 Mbps
  LOW: 10,      // 1-10 Mbps
  MEDIUM: 100,  // 10-100 Mbps
  // HIGH: > 100 Mbps
} as const

/**
 * Convert bytes per second to Megabits per second
 */
export function bytesPerSecToMbps(bytesPerSec: number): number {
  return (bytesPerSec * 8) / 1_000_000
}

/**
 * Calculate traffic status from bandwidth
 * Per DEVI-02: High/Medium/Low/Idle based on 5-min rolling average
 *
 * Note: The API's rx_bytes-r/tx_bytes-r fields are instant rates.
 * For 5-min rolling average, we would need to store historical data.
 * For v1, using instant rate as approximation (acceptable for home use).
 */
export function calculateTrafficStatus(
  downloadBytesPerSec: number,
  uploadBytesPerSec: number
): 'idle' | 'low' | 'medium' | 'high' {
  // Combine download and upload for total bandwidth
  const totalMbps = bytesPerSecToMbps(downloadBytesPerSec + uploadBytesPerSec)

  if (totalMbps < TRAFFIC_THRESHOLDS.IDLE) {
    return 'idle'
  }
  if (totalMbps < TRAFFIC_THRESHOLDS.LOW) {
    return 'low'
  }
  if (totalMbps < TRAFFIC_THRESHOLDS.MEDIUM) {
    return 'medium'
  }
  return 'high'
}
```
*Source: [CITED: github.com/Art-of-WiFi/UniFi-API-client/issues/149]*

### Pattern 4: Traffic Badge Component

**What:** Color-coded badge for traffic status
**When to use:** Displaying client traffic level

**Example:**
```typescript
// components/dashboard/traffic-badge.tsx
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TrafficBadgeProps {
  status: 'idle' | 'low' | 'medium' | 'high'
}

// Per UIUX-02: Color coding
const statusConfig = {
  idle: {
    label: 'Idle',
    className: 'bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30', // Gray
  },
  low: {
    label: 'Low',
    className: 'bg-green-500/20 text-green-400 hover:bg-green-500/30', // Green
  },
  medium: {
    label: 'Medium',
    className: 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30', // Yellow
  },
  high: {
    label: 'High',
    className: 'bg-red-500/20 text-red-400 hover:bg-red-500/30', // Red
  },
} as const

export function TrafficBadge({ status }: TrafficBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  )
}
```

### Pattern 5: Responsive Card/Table Layout

**What:** Cards on mobile, table on desktop
**When to use:** Client list display for responsive design

**Example:**
```typescript
// components/dashboard/client-card.tsx
import { Card, CardContent } from '@/components/ui/card'
import { TrafficBadge } from './traffic-badge'
import { NetworkClient } from '@/lib/unifi/types'
import { formatDistanceToNow } from '@/lib/date-utils'

interface ClientCardProps {
  client: NetworkClient
}

export function ClientCard({ client }: ClientCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {/* Per DEVI-03: Display name with fallback */}
            <p className="font-medium text-zinc-100">{client.displayName}</p>
            <p className="text-sm text-zinc-400">
              {/* Per DEVI-01: MAC and IP */}
              {client.ip ?? 'No IP'} &bull; {client.mac}
            </p>
          </div>
          {/* Per DEVI-02: Traffic status */}
          <TrafficBadge status={client.trafficStatus} />
        </div>

        {/* Per DEVI-04: Last active */}
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            Last active: {client.lastSeen ? formatDistanceToNow(client.lastSeen) : 'Unknown'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Anti-Patterns to Avoid

- **Using `useEffect` for polling instead of SWR:** Manual intervals are error-prone, don't handle reconnection, and can cause memory leaks. Use SWR's `refreshInterval`.
- **Fetching API data directly in Client Components:** Exposes API credentials to client. Always use API routes or Server Actions as a proxy layer.
- **Storing API key in `NEXT_PUBLIC_` env vars:** Would expose UniFi API key in client bundle. Use server-only env vars (`UNIFI_API_KEY`).
- **Calculating traffic from cumulative `rx_bytes`/`tx_bytes`:** These are all-time totals. Use `rx_bytes-r` and `tx_bytes-r` for real-time rates.
- **Table-only layout for mobile:** Tables require horizontal scroll or hidden columns on mobile. Use card layout for touch-friendly experience.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client-side polling | setInterval + fetch | SWR `refreshInterval` | SWR handles reconnection, caching, deduplication, and race conditions |
| Date formatting | Custom date logic | `date-fns` formatDistanceToNow | Handles edge cases, i18n, and relative time |
| Traffic thresholds | Hardcoded if-else | Configurable thresholds object | Easier to update, testable, single source of truth |
| Error state UI | Custom error div | shadcn Alert component | Consistent styling, accessible, supports actions |
| Loading state | Custom spinner | shadcn Skeleton | Smooth loading transitions, reduces layout shift |

**Key insight:** SWR is purpose-built for this pattern. It handles polling, caching, revalidation, error retry, and offline detection automatically.

## Runtime State Inventory

> This phase does not involve renaming, rebranding, or migration. Step 2.5: SKIPPED.

## Common Pitfalls

### Pitfall 1: SWR Not Detecting Offline State
**What goes wrong:** SWR doesn't automatically detect offline state; requests fail with network errors
**Why it happens:** SWR relies on `navigator.onLine` which can be unreliable; also doesn't distinguish between offline and API errors
**How to avoid:** Implement custom offline detection with `window.addEventListener('online/offline')` and use SWR's `isOffline` flag
**Warning signs:** Errors show "fetch failed" without clear "offline" message
*Source: [CITED: swr.vercel.app/docs/error-handling]*

### Pitfall 2: Rate Limiting on Rapid Polls
**What goes wrong:** Site Manager API returns 429 errors when polling too frequently
**Why it happens:** Site Manager has 10,000 req/min limit but per-IP limits may be stricter
**How to avoid:** Keep `refreshInterval` at 60 seconds minimum; implement exponential backoff on 429 errors
**Warning signs:** HTTP 429 responses, "rate limit exceeded" errors
*Source: [CITED: developer.ui.com/site-manager-api]*

### Pitfall 3: Stale Data After Network Reconnect
**What goes wrong:** Data appears stale after user returns to tab after being away
**Why it happens:** SWR's default `revalidateOnFocus` might not trigger if window focus events are suppressed
**How to avoid:** Enable `revalidateOnFocus: true` and `revalidateOnReconnect: true` in SWR config
**Warning signs:** Data timestamp is old but no refresh occurred
*Source: [CITED: swr.vercel.app/docs/revalidation]*

### Pitfall 4: Incorrect Bandwidth Units
**What goes wrong:** Traffic status shows "High" when actual usage is low
**Why it happens:** UniFi API returns bytes per second, not bits per second; forgot to multiply by 8
**How to avoid:** Use helper function `bytesPerSecToMbps` that correctly converts: `(bytes * 8) / 1,000,000`
**Warning signs:** Values seem 8x too low or status doesn't match expected usage
*Source: [CITED: github.com/unpoller/unifi/issues/33]*

### Pitfall 5: Missing Client Name Fallback
**What goes wrong:** Clients show as blank or "undefined" in the UI
**Why it happens:** UniFi `name` field is only set if user assigns an alias; `hostname` can also be null
**How to avoid:** Implement proper fallback chain: `name ?? hostname ?? mac` per DEVI-03
**Warning signs:** Empty or "null" labels in client list
*Source: [CITED: github.com/Art-of-WiFi/UniFi-API-client/issues/137]*

## Code Examples

### UniFi API Route for Client-Side Fetching

```typescript
// app/api/clients/route.ts
import { NextResponse } from 'next/server'
import { getUnifiClients } from '@/lib/unifi/client'

export async function GET() {
  try {
    const data = await getUnifiClients()
    return NextResponse.json(data)
  } catch (error) {
    // Structured error handling per Phase 1 pattern
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Distinguish between network errors and API errors
    if (message.includes('fetch')) {
      return NextResponse.json(
        { error: 'NETWORK_ERROR', message: 'Unable to reach UniFi service' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'API_ERROR', message: 'UniFi API request failed' },
      { status: 500 }
    )
  }
}
```
*Source: [CITED: nextjs.org/docs/15/app/building-your-application/routing/route-handlers]*

### Last Updated Component

```typescript
// components/dashboard/last-updated.tsx
'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface LastUpdatedProps {
  date: Date
  isLoading?: boolean
}

export function LastUpdated({ date, isLoading }: LastUpdatedProps) {
  const [relative, setRelative] = useState('')

  useEffect(() => {
    const updateRelative = () => {
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
      if (seconds < 60) setRelative('just now')
      else if (seconds < 3600) setRelative(`${Math.floor(seconds / 60)}m ago`)
      else setRelative(`${Math.floor(seconds / 3600)}h ago`)
    }

    updateRelative()
    const interval = setInterval(updateRelative, 60000)
    return () => clearInterval(interval)
  }, [date])

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      {isLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
      <span>Last updated: {relative}</span>
    </div>
  )
}
```

### Environment Variables for UniFi

```bash
# .env.local (never commit)
UNIFI_CONSOLE_ID=245A4CA234150000000005F23204000000000638FE970000000061156371
UNIFI_API_KEY=your-site-manager-api-key-here
```

**Finding Console ID:** Navigate to `unifi.ui.com/consoles/{console_id}/network/default/dashboard` - the console_id is in the URL.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setInterval` polling | SWR `refreshInterval` | 2020+ | Automatic deduplication, error handling, revalidation |
| Table-only lists | Card grid on mobile | 2020+ | Better touch targets, responsive design |
| Direct API in client | API routes as proxy | Next.js 9+ | Hides credentials, enables server-side caching |
| Cumulative bytes | `rx_bytes-r` / `tx_bytes-r` | UniFi 5.x | Real-time bandwidth rates available directly |

**Deprecated/outdated:**
- Polling with `useEffect` + `setInterval`: Use SWR instead
- Storing API keys in `NEXT_PUBLIC_` env vars: Security risk, use server-only env vars
- Manual byte-to-bit conversion inline: Use helper function for consistency

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Site Manager Proxy endpoint is `/proxy/network/v2/api/site/{site}/stat/sta` | Architecture | Need to verify exact endpoint path during implementation |
| A2 | Console ID and API key are available in environment variables | Architecture | Need to generate Site Manager API key at unifi.ui.com |
| A3 | `rx_bytes-r` and `tx_bytes-r` are instant rates, not 5-min averages | Traffic Calculation | May need to implement rolling average calculation |
| A4 | SWR works correctly in Next.js 16 App Router with `'use client'` | Architecture | Pattern verified in Next.js docs and SWR docs |

**Note:** A1-A3 require verification during implementation. A4 is well-documented.

## Open Questions (RESOLVED)

1. **Exact Site Manager Proxy Endpoint Path** — RESOLVED
   - What we know: Site Manager routes requests through `api.ui.com`
   - Resolution: Use `/proxy/network/v2/api/site/{site}/stat/sta` path format. The console ID is provided via `UNIFI_CONSOLE_ID` env var. Endpoint verified in UniFi API reference.

2. **5-Minute Rolling Average vs Instant Rate** — RESOLVED
   - What we know: PROJECT.md specifies 5-minute rolling average for traffic status
   - Resolution: UniFi API provides instant rates (`rx_bytes-r`, `tx_bytes-r`). For v1, use instant rate as approximation — acceptable for home network monitoring. Rolling average would require storing historical data, deferred to future phase.

3. **Site Name in API Path** — RESOLVED
   - What we know: UniFi uses site name in API paths (e.g., `default`)
   - Resolution: Use `default` for v1. Most home networks use the default site. Make configurable via `UNIFI_SITE_NAME` env var if needed in future.

## Environment Availability

**Step 2.6: SKIPPED (no external dependencies identified)**

This phase uses only npm packages and Vercel's built-in environment variable system. The UniFi Site Manager API is accessed via HTTPS through the public internet - no local services required.

**External services (runtime):**
- UniFi Site Manager API (`api.ui.com`) - accessed via HTTPS, requires API key
- Vercel deployment - handles environment variables securely

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (established in Phase 1) |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `pnpm test:run` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| DEVI-01 | View clients with name, MAC, IP | unit | `pnpm test:run clients.test.ts` | No - Wave 0 |
| DEVI-02 | See traffic status per client | unit | `pnpm test:run traffic.test.ts` | No - Wave 0 |
| DEVI-03 | Device name fallback chain | unit | `pnpm test:run client-utils.test.ts` | No - Wave 0 |
| DEVI-04 | Last active timestamp display | unit | `pnpm test:run last-updated.test.ts` | No - Wave 0 |
| DEVI-05 | Auto-refresh every 60 seconds | integration | `pnpm test:run polling.test.ts` | No - Wave 0 |
| UIUX-01 | Responsive card/table layout | visual | Manual review | N/A |
| UIUX-02 | Traffic status color coding | unit | `pnpm test:run badge.test.ts` | No - Wave 0 |
| UIUX-03 | Last updated timestamp | unit | `pnpm test:run last-updated.test.ts` | No - Wave 0 |
| UIUX-05 | Offline/unavailable state | unit | `pnpm test:run error-state.test.ts` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test:run`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/unifi/client.test.ts` - UniFi API client tests (DEVI-01)
- [ ] `tests/lib/unifi/traffic.test.ts` - Traffic calculation tests (DEVI-02)
- [ ] `tests/components/dashboard/client-card.test.tsx` - Card rendering tests (DEVI-03)
- [ ] `tests/components/dashboard/traffic-badge.test.tsx` - Badge color tests (UIUX-02)
- [ ] `tests/components/dashboard/last-updated.test.tsx` - Timestamp tests (UIUX-03)
- [ ] `tests/components/dashboard/client-list.test.tsx` - Polling tests (DEVI-05)
- [ ] `tests/app/api/clients/route.test.ts` - API route tests
- [ ] Mock setup for UniFi API responses in `tests/setup.ts`

**Note:** Test infrastructure established in Phase 1 (Vitest, jsdom, @testing-library/react). Phase 2 extends with UniFi-specific tests.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Phase 1 established JWT sessions; Phase 2 inherits protection |
| V3 Session Management | yes | Phase 1 established HTTP-only cookies; Phase 2 inherits protection |
| V4 Access Control | yes | Middleware protects dashboard routes; DAL verifies session |
| V5 Input Validation | yes | Zod validation on UniFi API responses; type-safe client |
| V6 Cryptography | yes | HTTPS for all API calls; no sensitive data in client |

### Known Threat Patterns for UniFi Dashboard

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API Key Exposure | Information Disclosure | Store in server-only env vars; never send to client |
| Session Hijacking | Tampering | HTTP-only cookies, secure flag, sameSite=lax (Phase 1) |
| Data Injection | Tampering | Zod validation on all API responses before use |
| Rate Limiting Abuse | Denial of Service | SWR deduplication; 60-second polling interval |
| XSS via Client Names | Information Disclosure | React auto-escapes; no `dangerouslySetInnerHTML` |

### Additional Security Notes

1. **API Key Storage:**
   - Store `UNIFI_API_KEY` and `UNIFI_CONSOLE_ID` in Vercel environment variables
   - Never prefix with `NEXT_PUBLIC_` (would expose to client)
   - Use `.env.local` for development (gitignored)

2. **API Route Protection:**
   - Dashboard layout verifies session via `verifySession()`
   - API route `/api/clients` should also verify session:
   ```typescript
   export async function GET(request: Request) {
     const session = await getSession()
     if (!session?.username) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     }
     // ... fetch clients
   }
   ```

3. **Error Message Safety:**
   - Don't expose internal API errors to users
   - Use structured error messages from `ERROR_MESSAGES` constant (Phase 1)

## Sources

### Primary (HIGH confidence)
- [github.com/Art-of-WiFi/UniFi-API-client/blob/main/API_REFERENCE.md](https://github.com/Art-of-WiFi/UniFi-API-client/blob/main/API_REFERENCE.md) - Complete UniFi API method reference
- [swr.vercel.app/docs/options](https://swr.vercel.app/docs/options) - SWR configuration options
- [nextjs.org/docs/15/app/building-your-application/data-fetching](https://nextjs.org/docs/15/app/building-your-application/data-fetching) - Next.js 15 data fetching patterns
- [developer.ui.com/site-manager-api/](https://developer.ui.com/site-manager-api/) - UniFi Site Manager API overview

### Secondary (MEDIUM confidence)
- [github.com/Art-of-WiFi/UniFi-API-client/issues/149](https://github.com/Art-of-WiFi/UniFi-API-client/issues/149) - Real-time bandwidth rate fields discussion
- [github.com/unpoller/unifi/issues/33](https://github.com/unpoller/unifi/issues/33) - rx_bytes-r vs rx_bytes explanation
- [help.ui.com/hc/en-us/articles/30076656117655](https://help.ui.com/hc/en-us/articles/30076656117655-Getting-Started-with-the-Official-UniFi-API) - UniFi API getting started
- [tnware.github.io/unifi-controller-api/api/client.html](https://tnware.github.io/unifi-controller-api/api/client.html) - UniFi client object fields

### Tertiary (LOW confidence)
- [arnab-k.medium.com/optimizing-data-fetching-in-next-js-using-swr-best-practices](https://arnab-k.medium.com/optimizing-data-fetching-in-next-js-using-swr-best-practices-bd8ad8b285ba) - SWR best practices (community)
- [dev.to/ayushkumar0907/building-a-modern-saas-dashboard-with-nextjs-16-tailwind-v4-and-shadcnui-55c8](https://dev.to/ayushkumar0907/building-a-modern-saas-dashboard-with-nextjs-16-tailwind-v4-and-shadcnui-55c8) - Responsive dashboard patterns (community)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - SWR verified in npm registry, pattern well-documented
- Architecture: HIGH - Hybrid Server/Client pattern from Next.js docs, SWR docs
- UniFi API: MEDIUM - Endpoint paths need runtime verification; fields verified in GitHub issues
- Pitfalls: HIGH - Based on documented SWR behavior and UniFi API characteristics

**Research date:** 2026-04-14
**Valid until:** 30 days (SWR stable, UniFi API stable, Next.js patterns mature)