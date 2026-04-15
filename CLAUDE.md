<!-- GSD:project-start source:PROJECT.md -->
## Project

**Unifi Network Dashboard**

A web application for monitoring home network traffic and managing firewall rules on a Unifi OS console. Built for personal use by a family household, it provides at-a-glance traffic status (high/medium/low/idle) for devices and groups, plus simple toggle controls for pre-existing firewall rules.

**Core Value:** **Visibility and control over home network traffic.** If everything else fails, users must be able to see which devices are actively using bandwidth and pause/resume internet access for specific devices or groups.

### Constraints

- **Tech Stack:** Next.js (full-stack framework)
- **Deployment:** Vercel
- **Connectivity:** Site Manager Proxy (no VPN, no direct access)
- **Authentication:** Family/household users (simple auth, not enterprise)
- **API Rate Limits:** Site Manager API has rate limits (10,000 req/min for v1 stable)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

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
# Create Next.js project
# Install core dependencies
# Install UI (shadcn/ui - run from project root)
# Install charts
# Install auth (choose one)
# OR
# Install build-time guards
## Authentication Decision
### Option A: Custom JWT (Recommended for this project)
### Option B: Auth.js v5 with Credentials
## UniFi Site Manager Proxy Client
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
- Use SWR with `refetchInterval: 300000` (5 minutes)
- Combine with Server Component for initial data (`fallbackData`)
- Example: `<Suspense><TrafficStats /></Suspense>` (Server) + `<ClientStatsPanel />` (Client with SWR)
- Vercel Cron Jobs in `vercel.json`:
- Secure with Authorization header
- Limited to 2 cron jobs on Hobby plan (daily minimum), 40 on Pro
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

### Git Commit Author

All commits must use:
- **Author name:** Faiser
- **Email:** keepbreakfastsimple@gmail.com

Configure globally:
```bash
git config --global user.name "Faiser"
git config --global user.email "keepbreakfastsimple@gmail.com"
```

Or per-commit:
```bash
git commit --author="Faiser <keepbreakfastsimple@gmail.com>" -m "message"
```
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
