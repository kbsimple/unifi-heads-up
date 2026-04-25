# Unifi Network Dashboard

## What This Is

A web application for monitoring home network traffic and managing firewall rules on a Unifi OS console. Built for personal use by a family household, it provides at-a-glance traffic status (high/medium/low/idle) for devices and groups, plus simple toggle controls for pre-existing firewall rules.

## Core Value

**Visibility and control over home network traffic.** If everything else fails, users must be able to see which devices are actively using bandwidth and pause/resume internet access for specific devices or groups.

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

### Active

- [ ] Direct local UniFi API client replaces Site Manager Proxy — API key auth over LAN
- [ ] App self-hosted locally (home server, NAS, or Dream Machine OS container)
- [ ] Traffic status dashboard delivers real working data via local client
- [ ] Firewall rule toggles work via local client
- [ ] Device groups function unchanged
- [ ] 24h traffic history charts function unchanged

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
- **Deployment:** Vercel
- **Connectivity:** Site Manager Proxy (no VPN, no direct access)
- **Authentication:** Family/household users (simple auth, not enterprise)
- **API Rate Limits:** Site Manager API has rate limits (10,000 req/min for v1 stable)

## Current Milestone: v2.0 Local Edition

**Goal:** Replace the broken Site Manager Proxy integration with a direct local UniFi console API client, and re-host the app on the local network instead of Vercel.

**Target features:**
- New local UniFi API client (API key auth, direct LAN access) replacing Site Manager Proxy entirely
- Traffic status dashboard — same behavior, working data
- Firewall rule toggles — same UI, working data
- Device groups — unchanged logic
- 24h traffic history — unchanged charts/logic
- Local deployment packaging (home server or Dream Machine OS)

## Current State

**Shipped:** v1.1 Dev Mocking (2026-04-19)
**In Progress:** v2.0 Local Edition — replacing Site Manager Proxy with direct local API

The Site Manager Proxy integration did not work. v2.0 replaces it wholesale with a direct local UniFi console client. The app will be self-hosted on the LAN (home server, NAS, or Dream Machine OS container) instead of Vercel.

**Codebase:** ~2,800 LOC TypeScript/TSX. Next.js 15 + Tailwind CSS 4 + shadcn/ui. 31 test files, 167 tests passing.

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
*Last updated: 2026-04-19 after v1.1 Dev Mocking milestone*