# Unifi Network Dashboard

## What This Is

A web application for monitoring home network traffic and managing firewall rules on a Unifi OS console. Built for personal use by a family household, it provides at-a-glance traffic status (high/medium/low/idle) for devices and groups, plus simple toggle controls for pre-existing firewall rules.

## Core Value

**Visibility and control over home network traffic.** If everything else fails, users must be able to see which devices are actively using bandwidth and pause/resume internet access for specific devices or groups.

## Current Milestone: v5.0 Streamlining Management UX Flows

**Goal:** Reduce friction in common management actions so users can act on what they see without navigating away.

**Target features:**
- Rule-to-device mapping: understand which firewall rules reference a given device (by MAC, IP, or IP group membership)
- Firewall shortcut in device activity: inline rule toggle in the expanded device row, powered by the mapping layer
- /statusz health page: DB + UniFi proxy status, app version

## Requirements

### Validated

- ✓ User can authenticate to access the dashboard — v1.0 (Phase 1)
- ✓ User can view real-time traffic status (high/medium/low/idle) for all network clients — v1.0 (Phase 2)
- ✓ User can toggle (enable/disable) pre-existing firewall rules — v1.0 (Phase 3)
- ✓ User can view traffic status for configured device groups — v1.0 (Phase 4)
- ✓ `UNIFI_MOCK=true` activates mock data layer; app runs in dev without real UniFi console — v1.1 (Phase 5)
- ✓ Real UniFi client code is unchanged — mock intercepts at the same function interface — v1.1 (Phase 5)
- ✓ `dev.sh` sets `UNIFI_MOCK=true` automatically — v1.1 (Phase 5)
- ✓ Mock returns ≥3 firewall rules with varied names and mixed enabled states; toggle persists in-memory — v1.1 (Phase 5)
- ✓ Mock returns ≥6 network clients covering High/Medium/Low/Idle statuses with name, MAC, IP, bytes/s — v1.1 (Phase 5)
- ✓ Server records bandwidth snapshots per client every 60s into SQLite, 30-day retention — v3.0 (Phase 8)
- ✓ Background server-side interval drives recording independent of browser sessions — v3.0 (Phase 8)
- ✓ User can star/unstar firewall rules (server-side), filter list to starred only — v3.0 (Phase 9)
- ✓ Insights page: heaviest-traffic devices ranked over 7/14/30 days — v3.0 (Phase 10)
- ✓ Insights page: per-device hourly activity patterns over 7/14/30 days — v3.0 (Phase 10)
- ✓ Firewall rule scheduling: 2h/6h/24h duration presets, auto-disable via UniFi native schedule, expiry badge — v3.0 (Phase 11)
- ✓ Critical user flows verified by automated E2E tests (auth, dashboard, firewall, insights) against real Next.js server — v4.0 (Phase 12)

### Active

- [ ] App can map firewall rules to devices by MAC/IP (including indirect membership via IP groups)
- [ ] User can see which firewall rules apply to a device from the device activity expanded row
- [ ] User can toggle applicable firewall rules directly from the device activity row without navigating to the Firewall page
- [ ] User can view app health status (/statusz): DB connectivity, UniFi proxy reachability, app version

### Out of Scope

- Creating new firewall rules — only toggling existing rules
- Real-time WebSocket streaming — polling is sufficient for 5-min averages
- Per-device threshold customization — using defaults for v1
- Direct API access to controller — using Site Manager Proxy exclusively

## Context

**Unifi Environment:**
- Unifi OS console (Dream Machine Pro or similar)
- Site Manager Proxy for remote API access via `api.ui.com`
- Local admin account or API key for authentication (MFA-exempt)

**User Base:**
- Family household members (multiple users)
- Non-technical users need simple, clear interface

**Traffic Thresholds (defaults):**
- Idle: < 1 Mbps average
- Low: 1-10 Mbps average
- Medium: 10-100 Mbps average
- High: > 100 Mbps average

**Measurement:** 5-minute rolling average bandwidth per client

## Constraints

- **Tech Stack:** Next.js (full-stack framework)
- **Deployment:** Docker, self-hosted on LAN (no cloud hosting — app must reach UniFi console over local network)
- **Connectivity:** Direct local UniFi API over LAN (X-API-KEY against the console's LAN IP)
- **Authentication:** Family/household users (simple auth, not enterprise)

## Current State

**Shipped:** v4.0 Quality & Testing (2026-06-11)
**Active:** v5.0 Streamlining Management UX Flows

The app is fully self-hosted on LAN via Docker, records continuous bandwidth snapshots into SQLite, shows an insights page with per-device usage patterns, lets users star and filter firewall rules, supports time-limited scheduling of firewall rules, and is now covered by a Playwright E2E test suite (15 browser-level tests) that runs against a real standalone Next.js server before each deploy.

**Codebase:** ~5,066 LOC TypeScript/TSX (source). Next.js 15 + Tailwind CSS 4 + shadcn/ui + better-sqlite3 + Playwright. 44 unit test files (319 tests) + 4 E2E spec files (15 tests).

**Known tech debt:** Schedule expiry badge timezone display may be offset on non-UTC servers. Live-hardware UAT for Phases 6–7 (LAN UniFi console) remains deferred. Auth file path hardcoded in two E2E files (drift risk).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Site Manager Proxy over VPN | Simpler setup, no firewall config, works behind CGNAT | ✓ Good — worked as expected |
| Next.js + Vercel | Full-stack framework with easy deployment | ✓ Good — zero-config deploy, Server Components reduced client JS |
| Polling over WebSocket | 5-min averages don't need real-time streaming | ✓ Good — SWR 60s polling sufficient |
| Default thresholds | Start simple, add configuration if needed later | ✓ Good — no user requests for customization yet |
| Toggle existing rules only | Lower complexity, user already has rules configured | ✓ Good — correct scope for family use |
| localStorage for groups | No database needed for single-user family app | ✓ Good — simple and effective |
| useRef for traffic history accumulation | Avoids re-renders on every SWR poll | ✓ Good — clean context pattern |
| Vitest + RTL over Playwright | Faster, easier for component-level UAT coverage | ✓ Good — all 5 UAT scenarios automated |
| Facade at index.ts (not per-request) | Evaluate UNIFI_MOCK once at module init — simpler, server restart to flip | ✓ Good — clean and predictable |
| In-memory toggle state (module-level var) | Resets on server restart (intentional) — no persistence needed for dev | ✓ Good — correct scope, MOCK-05 satisfied |
| Mock intercepts at client interface | Real client.ts unchanged — zero production risk from mock layer | ✓ Good — clean separation, routes exercise real code paths |
| UNIFI_MOCK=true as E2E mock strategy | undici.Agent ignores HTTP_PROXY, ruling out MSW/proxy approaches — in-process mock is the only clean option | ✓ Good — zero extra infrastructure, test env identical to dev env |
| Playwright standalone server (node .next/standalone/server.js) | `npm start` incompatible with `output: standalone`; standalone requires manual static asset copy | ✓ Good — correct production-like build tested, cp commands are standard Next.js standalone deployment steps |
| bcrypt ADMIN_PASSWORD in playwright.config.ts | `NODE_ENV=production` server rejects `DEV_ADMIN_PASSWORD` plaintext; E2E must use bcrypt hash | ✓ Good — correct security behavior verified by the tests themselves |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-18 after v5.0 milestone start*