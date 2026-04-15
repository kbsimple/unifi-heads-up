# Project Research Summary

**Project:** Unifi Network Dashboard
**Domain:** Network Monitoring Dashboard (Home/Consumer)
**Researched:** 2026-04-14
**Confidence:** HIGH

## Executive Summary

This is a family-focused network monitoring dashboard that integrates with Ubiquiti's UniFi Site Manager Proxy API. The product differentiates itself from UniFi's native UI by providing simplified, non-technical-friendly visibility into network traffic with device grouping and firewall rule toggling capabilities. Experts build this type of application using Next.js with Server Components for optimal data fetching, a Backend-for-Frontend (BFF) pattern to keep API keys server-side, and polling-based updates rather than real-time WebSockets.

The recommended approach is a monolithic Next.js 15 application deployed to Vercel, using Server Components by default for data-heavy dashboard pages, with a custom UniFi API client in the service layer. Authentication should use simple JWT-based auth (suitable for 2-5 family members), not enterprise Auth.js. Key risks include: (1) Zone-Based Firewall breaking legacy endpoints, (2) cloud dependency on api.ui.com availability, and (3) rate/bytes confusion in API responses.

## Key Findings

### Recommended Stack

Next.js 15 + React 19 + TypeScript 6 + Tailwind CSS 4. No Node.js library supports Site Manager Proxy — a custom UniFi client is required. Use `ky` for HTTP, `jose` for JWT auth, `shadcn/ui` for components, `Recharts` for visualization. Server Components by default, Client Components only for interactivity.

**Core technologies:**
- **Next.js 15**: Full-stack framework — App Router mature, React 19 support, optimal for Vercel
- **Custom UniFi Client**: API wrapper — No library supports Site Manager Proxy; build thin wrapper around fetch/ky
- **jose + http-only cookies**: JWT auth — Simple auth for 2-5 family members; ~50 lines of code
- **Tailwind CSS 4 + shadcn/ui**: Styling — CSS-first config, 3.5x faster builds, copy-paste components
- **Recharts**: Visualization — Lightweight (~45KB) for bandwidth charts

### Expected Features

**Must have (table stakes):**
- Device List — users expect to see what's on their network
- Real-Time Status (H/M/L/Idle) — core value: at-a-glance traffic visibility
- Device Naming — identify devices without MAC addresses
- Simple Authentication — private dashboard needs access control
- Mobile-Friendly UI — home users check from phones
- Clear Visual Indicators — red/yellow/green status at a glance

**Should have (competitive):**
- Device Groups — organize by family member or function
- Group Traffic Aggregation — see "Kids" bandwidth as aggregate
- Firewall Rule Toggling — pause internet for groups without complex UI
- Historical Trend View — see if bandwidth has been high for past hour/day

**Defer (v2+):**
- Per-Device Threshold Customization — smart defaults cover 95%
- Alert Notifications — dashboard check is sufficient for now
- Bandwidth Limiting — let native UI handle QoS

### Architecture Approach

Backend-for-Frontend (BFF) pattern with all API calls server-side. Data Access Layer (DAL) for authorized data fetching with React `cache()`. Server Actions for mutations with Zod validation. Polling via `router.refresh()` for updates (30-60s intervals sufficient for 5-min averages).

**Major components:**
1. **Service Layer** (`lib/services/unifi-client.ts`) — Site Manager Proxy client with rate limiting, error handling, ZBF detection
2. **Data Access Layer** (`lib/dal/`) — Authorized data fetching with caching, transforms API responses to minimal DTOs
3. **Server Components** — Dashboard pages that fetch directly via DAL
4. **Server Actions** — Mutations (firewall toggle) with revalidation

### Critical Pitfalls

1. **Zone-Based Firewall Breaks Legacy Endpoints** — Detect ZBF mode via `/site-feature-migration`, route to v2 endpoints when enabled
2. **Rate vs Cumulative Bytes Confusion** — Use `rx_bytes-r`/`tx_bytes-r` for rates (bytes/sec), not cumulative counters
3. **Authentication Throttling Lockout** — Use Site Manager API key (stateless), persist sessions if using local admin auth
4. **CSRF Token Required for Writes** — Include `x-csrf-token` header for all PUT/POST/DELETE with local auth (not needed for API key)
5. **Cloud Dependency** — Implement graceful degradation for api.ui.com outages; cache last-known-good data

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation & Authentication
**Rationale:** Must establish API layer and auth before any feature work; addresses all 6 critical pitfalls upfront
**Delivers:** UnifiClient service layer with rate limiting, ZBF detection, CSRF handling; JWT auth; error boundaries
**Addresses:** All PITFALLS (ZBF, auth throttling, CSRF, rate confusion, cloud dependency)
**Avoids:** Building features on shaky foundation; discovering API issues late

### Phase 2: Dashboard & Traffic Monitoring
**Rationale:** Validate API integration with safe GET requests before mutations; deliver core visibility value
**Delivers:** Device list, traffic status (H/M/L/Idle), device naming, mobile-responsive UI, polling hook
**Uses:** Next.js 15 Server Components, Recharts, shadcn/ui Card/Badge components
**Implements:** DAL getClients/getTrafficStats, Server Components for dashboard pages

### Phase 3: Firewall Control
**Rationale:** Key differentiator after read paths work; adds control capability
**Delivers:** Firewall rule list, enable/disable toggle, ZBF-aware endpoint routing
**Uses:** Server Actions with Zod validation, revalidation after mutations
**Implements:** DAL getFirewallRules, Server Action toggleFirewallRule

### Phase 4: Enhanced Features
**Rationale:** Competitive features after core is validated; adds grouping capability
**Delivers:** Device groups (local storage), group traffic aggregation, historical trends
**Uses:** Client Components for group management, localStorage for persistence
**Implements:** Group CRUD, aggregation calculations, trend caching

### Phase Ordering Rationale

- Phase 1 addresses all critical pitfalls before any feature work — prevents rework
- Phase 2 validates API integration with safe GET requests before mutations — lower risk
- Phase 3 adds key differentiator after read paths work — builds on stable foundation
- Phase 4 adds competitive features after core is validated — incremental value

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** ZBF endpoint discovery — test `/site-feature-migration` response format, verify v2 firewall policy endpoints
- **Phase 3:** ZBF toggle behavior — verify PATCH works on ZBF-enabled sites, document response format

Phases with standard patterns (skip research-phase):
- **Phase 2:** Server Components and polling are well-documented Next.js patterns
- **Phase 4:** Group persistence is client-side localStorage — standard web patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs for Next.js 15, React 19, Tailwind 4; Site Manager API documented |
| Features | HIGH | Clear P1/P2/P3 prioritization with anti-features identified |
| Architecture | HIGH | BFF and DAL patterns well-documented in Next.js ecosystem |
| Pitfalls | HIGH | Multiple GitHub issues confirm ZBF, auth, rate confusion |

**Overall confidence:** HIGH

### Gaps to Address

- **Device Group Persistence:** Research suggests local storage; decide during planning if server-side persistence needed for multi-device sync
- **Traffic Thresholds:** Define "high/medium/low" Mbps defaults during planning — recommend high >100Mbps for gigabit connections
- **Polling Interval:** Start with 60s default, add configuration if users request faster updates
- **ZBF Detection Schema:** Test `/site-feature-migration` endpoint during Phase 1 to document exact response format

## Sources

### Primary (HIGH confidence)
- [Next.js 15 Production Guide](https://nextjs.org/docs/15/app/guides/production-checklist) — framework patterns
- [UniFi Site Manager API Docs](https://developer.ui.com/site-manager-api/list-sites) — API endpoints
- [Art-of-WiFi UniFi-API-client](https://github.com/Art-of-WiFi/UniFi-API-client) — API patterns, pitfalls
- [UniFi API Authentication Methods](https://artofwifi.net/blog/unifi-api-authentication-local-admin-vs-api-key-vs-site-manager) — auth comparison

### Secondary (MEDIUM confidence)
- [Next.js Architecture Patterns](https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns) — DAL, Server Actions
- [Tailwind CSS v4 Release](https://tailwindcss.com/blog/tailwindcss-v4) — styling approach
- [shadcn/ui Installation](https://ui.shadcn.com/docs/installation/next) — component setup
- [Network Monitoring Dashboard Best Practices](https://moldstud.com/articles/p-best-practices-and-tools-for-building-a-network-monitoring-dashboard) — feature landscape

### Tertiary (LOW confidence)
- [Home Network Dashboard Examples](https://medium.com/@planedrop/pfsense-vs-unifi-in-depth-testing-and-experience-cce36ab72441) — UX patterns from community

---
*Research completed: 2026-04-14*
*Ready for roadmap: yes*