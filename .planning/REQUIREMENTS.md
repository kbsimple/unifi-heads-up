# Requirements: Unifi Network Dashboard

**Defined:** 2026-04-14
**Core Value:** Visibility and control over home network traffic — users must be able to see which devices are actively using bandwidth and pause/resume internet access for specific devices or groups

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can log in with username and password
- [ ] **AUTH-02**: User session persists across browser refreshes (7-day JWT)
- [ ] **AUTH-03**: User can log out from any page
- [ ] **AUTH-04**: Unauthenticated users are redirected to login page

### Device Visibility

- [ ] **DEVI-01**: User can view all network clients with name, MAC address, and IP address
- [ ] **DEVI-02**: User can see traffic status (High/Medium/Low/Idle) for each client based on 5-min rolling average bandwidth
- [ ] **DEVI-03**: User can see device name (falling back to hostname, then MAC)
- [ ] **DEVI-04**: User can see when each client was last active
- [ ] **DEVI-05**: Traffic data refreshes automatically (polling every 60 seconds)

### Device Groups

- [ ] **GRUP-01**: User can create device groups with custom names (e.g., "Kids", "IoT", "Work")
- [ ] **GRUP-02**: User can add devices to groups
- [ ] **GRUP-03**: User can remove devices from groups
- [ ] **GRUP-04**: User can delete device groups
- [ ] **GRUP-05**: Device groups persist across sessions (local storage)

### Group Traffic

- [ ] **GTRA-01**: User can see aggregated traffic status for a device group
- [ ] **GTRA-02**: User can see which devices in a group are currently active vs idle

### Firewall Control

- [ ] **FWRC-01**: User can view all pre-existing firewall rules with name and enabled/disabled status
- [ ] **FWRC-02**: User can toggle (enable/disable) a firewall rule via a simple switch
- [ ] **FWRC-03**: Firewall rule changes are reflected immediately in the UI after toggle
- [ ] **FWRC-04**: User sees clear error message if firewall toggle fails

### Historical Trends

- [ ] **HIST-01**: User can view 24-hour traffic trend for the overall site
- [ ] **HIST-02**: User can view 24-hour traffic trend for individual clients
- [ ] **HIST-03**: Trend data shows bandwidth usage in Mbps over time

### User Interface

- [ ] **UIUX-01**: Dashboard is usable on mobile devices (responsive design)
- [ ] **UIUX-02**: Traffic status uses clear color coding (green=low, yellow=medium, red=high, gray=idle)
- [ ] **UIUX-03**: Dashboard shows "last updated" timestamp so users know data freshness
- [ ] **UIUX-04**: Dashboard displays meaningful error messages (not generic "API Error")
- [ ] **UIUX-05**: Dashboard shows offline/unavailable state when cloud service is down

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications

- **NOTF-01**: User can configure threshold-based alerts
- **NOTF-02**: User receives notification when device goes offline/online

### Advanced

- **ADVN-01**: User can set per-device traffic thresholds
- **ADVN-02**: User can create new firewall rules from the dashboard
- **ADVN-03**: User can set bandwidth limits per device
- **ADVN-04**: Multiple user roles (admin vs viewer)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time WebSocket streaming | 5-min averages don't benefit; polling sufficient |
| Creating new firewall rules | Complex and dangerous for non-technical users; toggle existing rules only |
| Deep network diagnostics (ping, traceroute) | Overwhelms non-technical users; not core value |
| OAuth/SSO login | Family app needs simple auth, not enterprise features |
| Direct API access to controller | Site Manager Proxy exclusively; no VPN or port forwarding |
| Multi-site management | Single home network only for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| DEVI-01 | — | Pending |
| DEVI-02 | — | Pending |
| DEVI-03 | — | Pending |
| DEVI-04 | — | Pending |
| DEVI-05 | — | Pending |
| GRUP-01 | — | Pending |
| GRUP-02 | — | Pending |
| GRUP-03 | — | Pending |
| GRUP-04 | — | Pending |
| GRUP-05 | — | Pending |
| GTRA-01 | — | Pending |
| GTRA-02 | — | Pending |
| FWRC-01 | — | Pending |
| FWRC-02 | — | Pending |
| FWRC-03 | — | Pending |
| FWRC-04 | — | Pending |
| HIST-01 | — | Pending |
| HIST-02 | — | Pending |
| HIST-03 | — | Pending |
| UIUX-01 | — | Pending |
| UIUX-02 | — | Pending |
| UIUX-03 | — | Pending |
| UIUX-04 | — | Pending |
| UIUX-05 | — | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 0
- Unmapped: 28 ⚠️

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after initial definition*