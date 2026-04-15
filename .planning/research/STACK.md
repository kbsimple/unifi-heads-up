# Stack Research

**Domain:** Next.js web app with UniFi Site Manager Proxy API integration
**Researched:** 2026-04-14
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Next.js** | 15.x (stable) | Full-stack framework | App Router is now mature, React 19 support, Turbopack dev mode, optimal for Vercel deployment. Server Components drastically reduce client JS for dashboard apps. |
| **React** | 19.x | UI library | Required by Next.js 15. Server Components are default - 40-60% smaller bundles, 3-5x faster TTFB. Perfect for data-heavy dashboards. |
| **TypeScript** | 6.x | Type safety | Latest stable. Native compiler coming in v7 (10x faster). Critical for API client type safety with UniFi endpoints. |
| **Tailwind CSS** | 4.x | Styling | Production-ready since Jan 2025. CSS-first config (no tailwind.config.js), 3.5x faster builds, 35% smaller bundles. Works with shadcn/ui. |
| **Vercel** | Hobby/Pro | Deployment | Zero-config Next.js deployment. Built-in Cron Jobs for scheduled polling. Edge Functions available. Environment variable management. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **shadcn/ui** | Latest | Component library | For Card, Button, Badge, Dialog, Switch, Table components. Copy-paste approach (not npm dep) gives full control. Server Components compatible. |
| **Zod** | 4.x | Schema validation | Server Actions input validation. API response parsing. Type inference with `z.infer<>`. |
| **Recharts** | 3.x | Charts | Network traffic visualization (bandwidth over time, top clients by usage). Lightweight (~45KB), React-native components. Requires 'use client'. |
| **ky** | Latest | HTTP client | Smaller alternative to axios (12KB vs 13KB). Modern fetch wrapper with hooks. Used for UniFi API calls. |
| **jose** | Latest | JWT handling | If implementing custom auth. Edge Runtime compatible. Used for session tokens in HTTP-only cookies. |
| **server-only** | Latest | Build-time guard | Prevents accidental client imports of server code. Critical for keeping API keys secure. |

### Data Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Custom UniFi Client** | N/A | API wrapper | No Node.js library supports Site Manager Proxy yet. Build thin wrapper around fetch/ky. See implementation pattern below. |

## Installation

```bash
# Create Next.js project
npx create-next-app@latest unifi-dashboard --typescript --tailwind --app --src-dir

# Install core dependencies
npm install ky zod

# Install UI (shadcn/ui - run from project root)
npx shadcn@latest init
npx shadcn@latest add card button badge dialog switch table tabs

# Install charts
npm install recharts

# Install auth (choose one)
npm install jose http-only-cookie  # Custom JWT approach
# OR
npm install next-auth@beta @auth/core prisma @prisma/client  # Auth.js v5 approach

# Install build-time guards
npm install -D server-only
```

## Authentication Decision

For a **family/household app**, choose based on requirements:

### Option A: Custom JWT (Recommended for this project)
**When:** Simple auth, few users, self-hosted, no OAuth needed

```typescript
// lib/auth.ts
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);

  (await cookies()).set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 604800, // 7 days
  });
}
```

**Pros:** Minimal complexity, you control everything, ~50 lines of code
**Cons:** No password reset, no email verification, you handle security

### Option B: Auth.js v5 with Credentials
**When:** Need production features (password reset, rate limiting, email verification)

**Pros:** Battle-tested, handles edge cases, built-in security
**Cons:** More setup, requires database for sessions

**Recommendation:** Start with Option A (Custom JWT). Simpler for 2-5 family members. Migrate to Auth.js if complexity grows.

## UniFi Site Manager Proxy Client

No Node.js library currently supports Site Manager Proxy. Build a minimal client:

```typescript
// lib/unifi/client.ts
import ky from 'ky';
import { z } from 'zod';
import 'server-only';

const CONSOLE_ID = process.env.UNIFI_CONSOLE_ID!;
const API_KEY = process.env.UNIFI_API_KEY!;

const client = ky.create({
  prefixUrl: `https://api.ui.com/v1/connector/consoles/${CONSOLE_ID}/network`,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
  hooks: {
    beforeRequest: [
      (request) => {
        // Add site prefix to all requests
        const url = new URL(request.url);
        url.pathname = `/api/s/default${url.pathname}`;
        return new Request(url, request);
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          throw new Error(`Rate limited. Retry after ${retryAfter}s`);
        }
        if (response.status === 408) {
          throw new Error('Console offline or unreachable');
        }
        return response;
      },
    ],
  },
});

// Typed endpoints
export async function getClients() {
  return client.get('stat/sta').json<ClientListResponse>();
}

export async function getTrafficStats(start: number, end: number) {
  return client.get(`stat/report/5minutes.site?start=${start}&end=${end}`).json();
}

export async function getFirewallRules() {
  return client.get('rest/firewallrule').json<FirewallRulesResponse>();
}

export async function toggleFirewallRule(ruleId: string, enabled: boolean) {
  return client.put(`rest/firewallrule/${ruleId}`, {
    json: { enabled },
  }).json();
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 15 | Remix | If you prefer explicit data loading patterns over React Server Components |
| Tailwind CSS 4 | Tailwind CSS 3 | If you need Safari < 16.4 or Chrome < 111 support |
| Custom JWT | Auth.js v5 | If you need password reset, email verification, or OAuth providers |
| ky | axios | If you need request interceptors, retries, or legacy browser support |
| Recharts | Chart.js / D3 | If you need highly custom visualizations (Recharts is simpler) |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **SWR for server components** | SWR is client-side only. Server Components fetch directly. | `fetch()` in Server Components, SWR only in Client Components for real-time updates |
| **NEXT_PUBLIC_ for API keys** | Inlined into client bundle - visible in DevTools. | Server-only env vars (no prefix), accessed only in Server Components |
| **axios for UniFi client** | 13KB, overkill for simple API calls. | `ky` (12KB, modern fetch wrapper) or native `fetch` |
| **Prisma for this project** | No database needed for read-only dashboard + simple auth. | If persisting data later, add SQLite with Prisma |
| **Next.js API Routes for everything** | Server Actions are simpler for mutations. | Use API routes only for webhooks (none needed for v1) |
| **Client Components by default** | Kills performance, larger bundles. | Server Components by default, `'use client'` only for interactivity |

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| next | 15.x / 16.x | React 19.x, Node 18.18+ | App Router required for Server Components |
| react | 19.x | Next 15.x | React 18 also works but 19 is better |
| typescript | 6.x | Next 15.x | TypeScript 5.x also compatible |
| tailwindcss | 4.x | PostCSS 8+ | Requires Safari 16.4+, Chrome 111+ |
| recharts | 3.x | React 18.x+ | Must wrap in 'use client' component |

## Stack Patterns by Variant

**If you need real-time updates (future enhancement):**
- Use SWR with `refetchInterval: 300000` (5 minutes)
- Combine with Server Component for initial data (`fallbackData`)
- Example: `<Suspense><TrafficStats /></Suspense>` (Server) + `<ClientStatsPanel />` (Client with SWR)

**If you need background polling (cron):**
- Vercel Cron Jobs in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/refresh-cache",
    "schedule": "*/5 * * * *"
  }]
}
```
- Secure with Authorization header
- Limited to 2 cron jobs on Hobby plan (daily minimum), 40 on Pro

**If you need offline support:**
- Not recommended for v1 - adds significant complexity
- Future: Service Worker + IndexedDB cache

## Sources

- **Next.js 15 Production Guide** — [nextjs.org/docs/15/app/guides/production-checklist](https://nextjs.org/docs/15/app/guides/production-checklist) — HIGH confidence (official docs)
- **Next.js 15.5 Release** — [nextjs.org/blog/next-15-5](https://nextjs.org/blog/next-15-5) — HIGH confidence (official blog)
- **Tailwind CSS v4 Release** — [tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4) — HIGH confidence (official)
- **React 19 Server Components Best Practices** — [reactdevelopers.org/docs/react-19/server-components](https://reactdevelopers.org/docs/react-19/server-components) — HIGH confidence (official)
- **UniFi API Documentation** — [developer.ui.com/site-manager-api/list-sites](https://developer.ui.com/site-manager-api/list-sites) — HIGH confidence (official)
- **Art-of-WiFi UniFi-API-client Site Manager Support** — [GitHub commit](https://github.com/Art-of-WiFi/UniFi-API-client/commit/fc0deabd20bef0e9b7725e6412455dcab0386a10) — HIGH confidence (primary source)
- **UniFi API Reference (PHP client)** — [GitHub API_REFERENCE.md](https://github.com/Art-of-WiFi/UniFi-API-client/blob/main/API_REFERENCE.md) — HIGH confidence (community, well-maintained)
- **Auth.js v5 Credentials Guide** — [nextjslaunchpad.com/article/build-complete-auth-system-authjs-v5](https://nextjslaunchpad.com/article/build-complete-auth-system-authjs-v5-registration-login-password-reset-nextjs) — MEDIUM confidence (community)
- **shadcn/ui Installation** — [ui.shadcn.com/docs/installation/next](https://ui.shadcn.com/docs/installation/next) — HIGH confidence (official)
- **Vercel Environment Variables** — [vercel.com/docs/environment-variables](https://vercel.com/docs/environment-variables) — HIGH confidence (official)
- **Vercel Cron Jobs Guide** — [nextjslaunchpad.com/article/nextjs-cron-jobs-background-tasks-app-router-vercel-qstash-trigger-dev](https://nextjslaunchpad.com/article/nextjs-cron-jobs-background-tasks-app-router-vercel-qstash-trigger-dev) — MEDIUM confidence (community)
- **Zod Validation with Server Actions** — [damianhodgkiss.com/tutorials/type-safe-server-actions-nextjs-zod](https://damianhodgkiss.com/tutorials/type-safe-server-actions-nextjs-zod) — MEDIUM confidence (community)
- **node-unifi npm** — [npmjs.com/package/node-unifi](https://www.npmjs.com/package/node-unifi) — HIGH confidence (registry)

---
*Stack research for: UniFi Network Dashboard via Site Manager Proxy*
*Researched: 2026-04-14*