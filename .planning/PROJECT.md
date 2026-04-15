# Unifi Network Dashboard

## What This Is

A web application for monitoring home network traffic and managing firewall rules on a Unifi OS console. Built for personal use by a family household, it provides at-a-glance traffic status (high/medium/low/idle) for devices and groups, plus simple toggle controls for pre-existing firewall rules.

## Core Value

**Visibility and control over home network traffic.** If everything else fails, users must be able to see which devices are actively using bandwidth and pause/resume internet access for specific devices or groups.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can view real-time traffic status (high/medium/low/idle) for all network clients
- [ ] User can view traffic status for configured device groups
- [ ] User can toggle (enable/disable) pre-existing firewall rules
- [ ] User can authenticate to access the dashboard

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

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Site Manager Proxy over VPN | Simpler setup, no firewall config, works behind CGNAT | — Pending |
| Next.js + Vercel | Full-stack framework with easy deployment | — Pending |
| Polling over WebSocket | 5-min averages don't need real-time streaming | — Pending |
| Default thresholds | Start simple, add configuration if needed later | — Pending |
| Toggle existing rules only | Lower complexity, user already has rules configured | — Pending |

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
*Last updated: 2026-04-14 after initialization*