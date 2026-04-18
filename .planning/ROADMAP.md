# Roadmap: Unifi Network Dashboard

## Overview

A phased journey from foundation to enhanced features, delivering visibility and control over home network traffic. Starting with authentication and API infrastructure, then building core traffic monitoring capabilities, adding firewall control, and finally enhancing with device grouping and historical trends. Each phase delivers a complete, verifiable capability that builds on the previous.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Authentication** - Establish secure API layer and user authentication
- [x] **Phase 2: Dashboard & Traffic Monitoring** - Display device list with real-time traffic status
- [ ] **Phase 3: Firewall Control** - Toggle firewall rules to control network access
- [ ] **Phase 4: Enhanced Features** - Device groups and historical traffic trends

## Phase Details

### Phase 1: Foundation & Authentication
**Goal**: Users can securely access the dashboard with proper error handling for API failures
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, UIUX-04
**Success Criteria** (what must be TRUE):
  1. User can log in with username and password
  2. User stays logged in across browser refreshes (7-day session persists)
  3. User can log out from any page
  4. Unauthenticated users are redirected to login page
  5. User sees meaningful error messages when authentication or API fails
**Plans**: 6 plans in 4 waves
**UI hint**: yes

Plans:
- [x] 01-01-PLAN.md — Project initialization, dependencies, Vitest, shadcn/ui
- [x] 01-02-PLAN.md — Type definitions and session management (JWT)
- [x] 01-03-PLAN.md — Data Access Layer and Server Actions (login/logout)
- [x] 01-04-PLAN.md — Middleware route protection
- [x] 01-05-PLAN.md — Login page UI
- [x] 01-06-PLAN.md — Dashboard layout and logout button

### Phase 2: Dashboard & Traffic Monitoring
**Goal**: Users can see real-time traffic status for all network devices at a glance
**Depends on**: Phase 1
**Requirements**: DEVI-01, DEVI-02, DEVI-03, DEVI-04, DEVI-05, UIUX-01, UIUX-02, UIUX-03, UIUX-05
**Success Criteria** (what must be TRUE):
  1. User can view all network clients with name, MAC address, and IP address
  2. User sees traffic status (High/Medium/Low/Idle) for each client with color coding
  3. Dashboard works on mobile devices (responsive design)
  4. User sees "last updated" timestamp indicating data freshness
  5. User sees offline/unavailable state when cloud service is down
**Plans**: 3 plans in 3 waves
**UI hint**: yes

Plans:
- [x] 02-01-PLAN.md — API foundation (SWR, shadcn components, UniFi client)
- [x] 02-02-PLAN.md — Dashboard UI components
- [x] 02-03-PLAN.md — Integration with polling and checkpoint

### Phase 3: Firewall Control
**Goal**: Users can control network access by toggling firewall rules
**Depends on**: Phase 2
**Requirements**: FWRC-01, FWRC-02, FWRC-03, FWRC-04
**Success Criteria** (what must be TRUE):
  1. User can view all firewall rules with name and enabled/disabled status
  2. User can toggle a rule on/off with a simple switch control
  3. Rule status changes appear immediately in the UI after toggle
  4. User sees clear error message if toggle operation fails
**Plans**: 4 plans in 4 waves

Plans:
- [ ] 03-01-PLAN.md — Install Switch component, add FirewallPolicy types, extend UniFi client with firewall functions
- [ ] 03-02-PLAN.md — Create firewall API route with GET/PUT handlers
- [ ] 03-03-PLAN.md — Create firewall UI foundation (navigation tabs, FirewallCard, RuleToggle)
- [ ] 03-04-PLAN.md — Create FirewallList component and firewall page with server-side data fetch

### Phase 4: Enhanced Features
**Goal**: Users can organize devices into groups and view traffic history
**Depends on**: Phase 3
**Requirements**: GRUP-01, GRUP-02, GRUP-03, GRUP-04, GRUP-05, GTRA-01, GTRA-02, HIST-01, HIST-02, HIST-03
**Success Criteria** (what must be TRUE):
  1. User can create device groups with custom names (e.g., "Kids", "IoT")
  2. User can add and remove devices from groups
  3. User can delete device groups (persisted across sessions)
  4. User sees aggregated traffic status for each group
  5. User sees which devices in a group are active vs idle
  6. User can view 24-hour traffic trends for overall site and individual clients
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Authentication | 6/6 | Complete | 2026-04-15 |
| 2. Dashboard & Traffic Monitoring | 3/3 | Complete | 2026-04-15 |
| 3. Firewall Control | 0/4 | Not started | - |
| 4. Enhanced Features | 0/TBD | Not started | - |