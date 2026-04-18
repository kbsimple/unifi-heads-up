# Phase 4: Enhanced Features - Research

**Researched:** 2026-04-18
**Domain:** Device grouping, traffic aggregation, historical trends visualization
**Confidence:** HIGH

## Summary

Phase 4 introduces two major feature areas: **device groups** (create, assign, persist) and **historical traffic trends** (24-hour charts). Both features are client-side only, leveraging existing SWR polling infrastructure and the established component patterns from Phases 2 and 3.

**Primary recommendation:** Install Recharts for charts, shadcn Dialog for group creation modal, and implement a custom `useLocalStorage` hook (pattern from usehooks-ts) for group persistence. Use React Context for traffic history accumulation, sampling every 60s aligned with SWR polling.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Third tab "Groups" in top navigation
- **D-02:** Navigation becomes: Dashboard | Firewall | Groups (three tabs, same styling)
- **D-03:** Groups page shows all groups as cards, click to expand and see devices within
- **D-04:** Modal dialog for creating groups
- **D-05:** Checkbox multi-select for adding devices
- **D-06:** Inline device list within group card
- **D-07:** Remove device via X button on device chip
- **D-08:** LocalStorage for group data persistence
- **D-09:** Group data structure: `{ id, name, deviceIds: string[] }` stored as JSON array
- **D-10:** Group card shows aggregated traffic status
- **D-11:** Per-device status visible when group expanded
- **D-12:** Empty group shows "No devices" placeholder
- **D-13:** Expandable panel on client card for history
- **D-14:** Site-wide trend accessible via "Site Traffic" section
- **D-15:** Line chart (area fill) for time-series — Recharts
- **D-16:** 24-hour window with hourly data points (24 points total)
- **D-17:** Client-side accumulation during session (samples every 60s)
- **D-18:** Data stored in React state/context, lost on page refresh

### Claude's Discretion
- shadcn Dialog component for group creation modal
- Recharts AreaChart for traffic trends
- Existing Badge component for traffic status
- Existing Card component for group cards
- LocalStorage via custom hook (pattern: `useLocalStorage`)

### Deferred Ideas (OUT OF SCOPE)
- Persistent historical data — Vercel Cron + KV storage
- Custom time ranges — Beyond 24-hour window
- Group-based firewall rules — Apply firewall toggle to entire group
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GRUP-01 | User can create device groups with custom names | Dialog modal + LocalStorage hook |
| GRUP-02 | User can add devices to groups | Checkbox multi-select in modal |
| GRUP-03 | User can remove devices from groups | X button on device chip |
| GRUP-04 | User can delete device groups | Delete action on group card |
| GRUP-05 | Device groups persist across sessions | useLocalStorage hook |
| GTRA-01 | User can see aggregated traffic status for a device group | Group traffic aggregation logic |
| GTRA-02 | User can see which devices in a group are active vs idle | Expanded group view with per-device badges |
| HIST-01 | User can view 24-hour traffic trend for the overall site | Recharts AreaChart + TrafficHistoryContext |
| HIST-02 | User can view 24-hour traffic trend for individual clients | Expandable panel on client card |
| HIST-03 | Trend data shows bandwidth usage in Mbps over time | Data format + Y-axis configuration |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Recharts** | 3.8.1 | Charts | [VERIFIED: npm registry] Recommended in CLAUDE.md, mature React charting library with AreaChart support |
| **shadcn Dialog** | Latest | Modal dialogs | [CITED: ui.shadcn.com/docs/components/dialog] Already using shadcn components, consistent styling |
| **useLocalStorage** | Custom hook | Persistence | [CITED: usehooks-ts pattern] Simple implementation, avoids external dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **usehooks-ts** | 3.1.1 (optional) | useLocalStorage hook | If preferring library over custom implementation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js | Chart.js needs react-chartjs-2 wrapper, more setup |
| Recharts | D3 | D3 is lower-level, more code for simple area charts |
| Custom useLocalStorage | usehooks-ts package | Package adds dependency; custom hook is ~30 lines |

**Installation:**
```bash
# Required
npm install recharts
npx shadcn@latest add dialog

# Optional (if using library instead of custom hook)
npm install usehooks-ts
```

**Version verification:**
- Recharts: 3.8.1 [VERIFIED: npm view recharts version]
- usehooks-ts: 3.1.1 [VERIFIED: npm view usehooks-ts version]

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/(dashboard)/
│   ├── layout.tsx          # Add Groups tab
│   ├── page.tsx            # Dashboard (existing)
│   ├── firewall/page.tsx   # Firewall (existing)
│   └── groups/page.tsx     # NEW: Groups page
├── components/
│   ├── ui/
│   │   └── dialog.tsx      # NEW: Install via shadcn
│   ├── dashboard/
│   │   ├── client-card.tsx      # Extend with history expandable
│   │   └── traffic-chart.tsx    # NEW: AreaChart component
│   └── groups/
│       ├── group-card.tsx      # NEW: Individual group card
│       ├── group-list.tsx      # NEW: List of all groups
│       ├── create-group-modal.tsx  # NEW: Modal for creating groups
│       └── device-chip.tsx     # NEW: Device chip with remove button
├── hooks/
│   ├── use-local-storage.ts    # NEW: LocalStorage hook
│   └── use-groups.ts           # NEW: Group management hook
└── contexts/
    └── traffic-history-context.tsx  # NEW: Traffic history accumulation
```

### Pattern 1: useLocalStorage Hook

**What:** Custom hook for persisting data to localStorage with SSR safety
**When to use:** Group persistence (GRUP-05)

**Example:**
```typescript
// Source: [CITED: usehooks-ts.com/react-hook/use-local-storage]
import { useState, useEffect, useCallback } from 'react'

function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // SSR-safe initialization
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  // Sync to localStorage on change
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.warn(`Error saving to localStorage:`, error)
    }
  }, [key, storedValue])

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const next = value instanceof Function ? value(prev) : value
      return next
    })
  }, [])

  return [storedValue, setValue]
}
```

### Pattern 2: Traffic History Context

**What:** React Context for accumulating traffic samples every 60s
**When to use:** Historical trends (HIST-01, HIST-02, HIST-03)

**Example:**
```typescript
// Pattern: [CITED: dev.to/forem/ibtekar/building-high-performance-real-time-chart]
'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import { useSWRConfig } from 'swr'

interface TrafficSample {
  timestamp: number
  totalDownload: number  // bytes per second
  totalUpload: number
}

interface TrafficHistoryContextValue {
  siteHistory: TrafficSample[]  // 24 points max
  getClientHistory: (clientId: string) => TrafficSample[]
}

const TrafficHistoryContext = createContext<TrafficHistoryContextValue | null>(null)

export function TrafficHistoryProvider({ children }: { children: React.ReactNode }) {
  const historyRef = useRef<TrafficSample[]>([])
  const { data } = useSWRConfig() // Access SWR cache

  useEffect(() => {
    // Sample every 60s aligned with polling
    const interval = setInterval(() => {
      const clients = data?.['/api/clients']?.clients
      if (!clients) return

      const now = Date.now()
      const sample: TrafficSample = {
        timestamp: now,
        totalDownload: clients.reduce((sum: number, c: any) => sum + c.downloadRate, 0),
        totalUpload: clients.reduce((sum: number, c: any) => sum + c.uploadRate, 0),
      }

      // Keep last 24 samples (24 hours at 1 sample/60s = 24 minutes for MVP)
      // Per D-16: 24 hourly points - adjust sampling for hourly
      historyRef.current = [...historyRef.current.slice(-23), sample]
    }, 60000)

    return () => clearInterval(interval)
  }, [data])

  return (
    <TrafficHistoryContext.Provider value={{ siteHistory: historyRef.current, getClientHistory: () => [] }}>
      {children}
    </TrafficHistoryContext.Provider>
  )
}
```

### Pattern 3: Recharts AreaChart

**What:** Client component for rendering area charts with gradient fill
**When to use:** Traffic trends display (HIST-01, HIST-02, HIST-03)

**Example:**
```typescript
// Source: [CITED: recharts.org/en-US/api/AreaChart]
'use client'

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface TrafficChartProps {
  data: Array<{ time: string; bandwidth: number }>
}

export function TrafficChart({ data }: TrafficChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fill: '#a1a1aa', fontSize: 12 }}
          axisLine={{ stroke: '#3f3f46' }}
        />
        <YAxis
          tick={{ fill: '#a1a1aa', fontSize: 12 }}
          axisLine={{ stroke: '#3f3f46' }}
          tickFormatter={(value) => `${(value / 1_000_000).toFixed(1)} Mbps`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#a1a1aa' }}
        />
        <Area
          type="monotone"
          dataKey="bandwidth"
          stroke="#0ea5e9"
          fillOpacity={1}
          fill="url(#trafficGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

### Anti-Patterns to Avoid

- **Using Recharts without "use client"**: Recharts requires browser DOM. Always add directive. [CITED: edupala.com/comprehensive-guide-using-recharts-in-next-js-with-typescript]
- **Raw Context for high-frequency data**: Use selector patterns or memoization to prevent excessive re-renders. [CITED: azguards.com/performance-optimization/the-propagation-penalty-bypassing-react-context-re-renders-via-usesyncexternalstore]
- **Storing Date objects in localStorage**: JSON.stringify loses Date type. Store timestamps (numbers) instead. [CITED: usehooks-ts.com/react-hook/use-local-storage]
- **Skipping SSR guards in localStorage hook**: Causes hydration mismatch in Next.js. Always check `typeof window === 'undefined'`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Area chart for traffic trends | Custom SVG or Canvas | Recharts | Handles responsiveness, tooltips, gradients out of box |
| Modal dialog for group creation | Custom overlay + focus trap | shadcn Dialog | Accessible, keyboard navigation, focus management |
| LocalStorage state sync | Manual useState + useEffect | useLocalStorage hook | Handles SSR, JSON parse/stringify, error recovery |
| Traffic status aggregation | Manual reduce in component | Group context/hook | Reusable, testable, consistent calculation |

**Key insight:** Both features (groups, trends) are pure client-side concerns. No server-side API changes needed.

## Common Pitfalls

### Pitfall 1: Recharts Hydration Mismatch
**What goes wrong:** Server renders without data, client renders with different content
**Why it happens:** Recharts needs client-side only rendering
**How to avoid:** Always use `"use client"` directive; consider `dynamic(() => import(...), { ssr: false })` for complex charts
**Warning signs:** Console warnings about hydration mismatch, chart not rendering

### Pitfall 2: LocalStorage Quota Exceeded
**What goes wrong:** localStorage.setItem throws error when storage is full
**Why it happens:** localStorage has ~5MB limit per origin
**How to avoid:** Wrap all localStorage operations in try/catch; clear old data if needed
**Warning signs:** Groups not persisting after refresh, console errors

### Pitfall 3: Traffic History Memory Leak
**What goes wrong:** Accumulating unlimited samples causes performance degradation
**Why it happens:** No upper bound on history array
**How to avoid:** Limit to 24 samples (per D-16), use circular buffer pattern
**Warning signs:** Browser tab using excessive memory, slow renders

### Pitfall 4: Group Traffic Calculation Timing
**What goes wrong:** Group traffic shows stale data after client list updates
**Why it happens:** Group aggregation depends on client data, but runs before SWR updates
**How to avoid:** Compute group traffic on-demand in component render (derive, don't store)
**Warning signs:** Group badges out of sync with individual device badges

### Pitfall 5: Dialog Component Not Installed
**What goes wrong:** Import error for dialog component
**Why it happens:** Dialog is not in shadcn/ui by default
**How to avoid:** Run `npx shadcn@latest add dialog` before using
**Warning signs:** Module not found error during build

## Code Examples

Verified patterns from official sources:

### Dialog Modal for Group Creation
```typescript
// Source: [CITED: ui.shadcn.com/docs/components/dialog]
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function CreateGroupModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">New Group</Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Create Device Group</DialogTitle>
          <DialogDescription>
            Enter a name and select devices to add to this group.
          </DialogDescription>
        </DialogHeader>
        {/* Form content here */}
      </DialogContent>
    </Dialog>
  )
}
```

### Group Card with Expandable Devices
```typescript
// Pattern from existing client-card.tsx
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

interface Group {
  id: string
  name: string
  deviceIds: string[]
}

interface GroupCardProps {
  group: Group
  devices: NetworkClient[]
  onRemoveDevice: (groupId: string, deviceId: string) => void
  onDelete: (groupId: string) => void
}

export function GroupCard({ group, devices, onRemoveDevice, onDelete }: GroupCardProps) {
  const [expanded, setExpanded] = useState(false)
  const groupDevices = devices.filter(d => group.deviceIds.includes(d.id))

  // Calculate aggregated traffic status
  const aggregatedStatus = calculateGroupTrafficStatus(groupDevices)

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-left flex items-center gap-2"
          >
            <span className="font-medium text-zinc-100">{group.name}</span>
            <span className="text-sm text-zinc-500">({groupDevices.length} devices)</span>
          </button>
          <div className="flex items-center gap-2">
            <Badge className={getStatusClassName(aggregatedStatus)}>
              {aggregatedStatus}
            </Badge>
            <button onClick={() => onDelete(group.id)} className="text-zinc-500 hover:text-red-400">
              <XIcon />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            {groupDevices.length === 0 ? (
              <p className="text-sm text-zinc-500">No devices in this group</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {groupDevices.map(device => (
                  <DeviceChip
                    key={device.id}
                    device={device}
                    onRemove={() => onRemoveDevice(group.id, device.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class components for charts | Function components with hooks | React 16.8+ | Simpler state management |
| Chart.js with wrapper | Recharts native React | 2020+ | Better React integration |
| Redux for client state | React Context + SWR | Next.js 13+ | Less boilerplate for dashboard apps |
| Server-side data persistence | LocalStorage for simple data | Always viable | No backend needed for user preferences |

**Deprecated/outdated:**
- **D3 for simple area charts**: Overkill for time-series visualization. Recharts provides better React integration. [CITED: recharts.github.io/en-US/api/AreaChart]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 24 hourly data points achievable with 60s polling | Historical Trends | Need 24 hours of continuous session time; user may refresh before full history accumulated |
| A2 | LocalStorage sufficient for group data size | Group Persistence | Groups with many devices could approach 5MB limit; unlikely for family household |
| A3 | Traffic history lost on refresh is acceptable for MVP | Historical Trends | User explicitly accepted this in CONTEXT.md D-18 |

**If this table is empty:** All claims in this research were verified or cited.

## Open Questions

1. **How to handle client history data?**
   - What we know: Context accumulates site-wide totals, SWR has per-client data
   - What's unclear: Should we also accumulate per-client history (more memory) or compute on-demand from site totals?
   - Recommendation: Start with site-wide history only; add per-client if performance allows

2. **Hourly vs minute-level granularity?**
   - What we know: D-16 specifies 24 points for 24-hour window (hourly)
   - What's unclear: Polling is every 60s, so should we sample every minute and aggregate to hourly?
   - Recommendation: For MVP, accumulate 24 samples at 60s intervals = 24 minutes. Expand to hourly later.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Recharts | Traffic trends | Needs install | 3.8.1 | — |
| shadcn Dialog | Group creation modal | Needs install | Latest | — |
| localStorage | Group persistence | ✓ (browser) | — | — |
| React 19 | Component patterns | ✓ | 19.2.4 | — |
| SWR | Polling integration | ✓ | 2.4.1 | — |

**Missing dependencies with no fallback:**
- Recharts — install via `npm install recharts`
- shadcn Dialog — install via `npx shadcn@latest add dialog`

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
|--------|----------|-----------|-------------------|--------------|
| GRUP-01 | Create device groups with names | unit | `npm test -- --grep "CreateGroupModal"` | Wave 0 |
| GRUP-02 | Add devices to groups | unit | `npm test -- --grep "GroupCard.*add"` | Wave 0 |
| GRUP-03 | Remove devices from groups | unit | `npm test -- --grep "DeviceChip.*remove"` | Wave 0 |
| GRUP-04 | Delete device groups | unit | `npm test -- --grep "GroupCard.*delete"` | Wave 0 |
| GRUP-05 | Groups persist to localStorage | unit | `npm test -- --grep "useLocalStorage"` | Wave 0 |
| GTRA-01 | Aggregated traffic status for group | unit | `npm test -- --grep "GroupCard.*traffic"` | Wave 0 |
| GTRA-02 | Per-device status in expanded group | unit | `npm test -- --grep "GroupCard.*expanded"` | Wave 0 |
| HIST-01 | Site-wide 24-hour trend | unit | `npm test -- --grep "TrafficChart.*site"` | Wave 0 |
| HIST-02 | Per-client 24-hour trend | unit | `npm test -- --grep "TrafficChart.*client"` | Wave 0 |
| HIST-03 | Bandwidth in Mbps over time | unit | `npm test -- --grep "TrafficChart.*y-axis"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/hooks/use-local-storage.test.ts` - covers GRUP-05
- [ ] `tests/hooks/use-groups.test.ts` - covers GRUP-01 through GRUP-04
- [ ] `tests/components/groups/group-card.test.tsx` - covers GTRA-01, GTRA-02
- [ ] `tests/components/groups/create-group-modal.test.tsx` - covers GRUP-01
- [ ] `tests/components/groups/device-chip.test.tsx` - covers GRUP-03
- [ ] `tests/components/dashboard/traffic-chart.test.tsx` - covers HIST-01, HIST-02, HIST-03
- [ ] `tests/contexts/traffic-history-context.test.tsx` - covers history accumulation

*(Existing test infrastructure from Phases 1-3 provides patterns for mocking SWR, shadcn components, and browser APIs)*

## Security Domain

> Applicable to this phase: Client-side only features, no new API endpoints

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Existing session auth (Phase 1) |
| V3 Session Management | no | Existing JWT sessions (Phase 1) |
| V4 Access Control | no | Client-side only, no new data access |
| V5 Input Validation | yes | Zod for group names |
| V6 Cryptography | no | No sensitive data in groups/history |

### Known Threat Patterns for Client-Side Storage

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via group names | Tampering | Sanitize/validate group names with Zod |
| localStorage tampering | Tampering | Validate data on read, handle parse errors gracefully |
| CSRF (not applicable) | — | No API changes for this phase |

**Input Validation for Group Names:**
```typescript
// Zod schema for group validation
const GroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50).regex(/^[\w\s-]+$/, 'Only letters, numbers, spaces, and hyphens'),
  deviceIds: z.array(z.string()),
})
```

## Sources

### Primary (HIGH confidence)
- [Recharts AreaChart API](https://recharts.org/en-US/api/AreaChart) - AreaChart configuration
- [Recharts ResponsiveContainer](https://recharts.org/en-US/api/ResponsiveContainer) - Container sizing
- [shadcn Dialog](https://ui.shadcn.com/docs/components/dialog) - Modal component installation and usage

### Secondary (MEDIUM confidence)
- [usehooks-ts useLocalStorage](https://usehooks-ts.com/react-hook/use-local-storage) - Hook pattern for localStorage
- [React SME Cookbook - useLocalStorage](https://reactdevelopers.org/docs/custom-hooks/use-local-storage) - Best practices
- [Recharts with Next.js Guide](https://edupala.com/comprehensive-guide-using-recharts-in-next-js-with-typescript/) - Integration patterns
- [High-Performance Real-Time Charts](https://dev.to/ibtekar/building-a-high-performance-real-time-chart-in-react-lessons-learned) - Time series patterns

### Tertiary (LOW confidence)
- None - all claims verified or cited

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts verified in npm registry, shadcn Dialog verified in official docs
- Architecture: HIGH - Patterns follow existing codebase conventions from Phases 1-3
- Pitfalls: HIGH - Based on documented Recharts/React patterns and localStorage limitations

**Research date:** 2026-04-18
**Valid until:** 30 days (stable libraries, no major version changes expected)