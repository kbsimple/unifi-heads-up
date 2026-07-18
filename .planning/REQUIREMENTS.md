# Requirements: Unifi Network Dashboard

**Defined:** 2026-07-18
**Core Value:** Visibility and control over home network traffic — users must be able to see which devices are actively using bandwidth and pause/resume internet access for specific devices.

## v5.0 Requirements — Streamlining Management UX Flows

### Mapping Layer (MAPP)

- [ ] **MAPP-01**: App determines which firewall policies target a device by MAC address (ZBF: `source.client_macs` / `destination.client_macs`; legacy: `srcMac`)
- [ ] **MAPP-02**: App determines which firewall policies target a device by exact IP address (legacy mode only — `srcAddress`; IP matching not used in ZBF mode)
- [ ] **MAPP-03**: Mapping uses ZBF or legacy matching path based on firewall mode, resolved once at startup via `isZoneBasedFirewallEnabled()`

### Firewall UX (FWUX)

- [ ] **FWUX-01**: User sees a compact list of matching firewall rules (name + toggle) when expanding a device row in the dashboard
- [ ] **FWUX-02**: User can toggle a matching rule on/off directly from the expanded device row without navigating to the Firewall page
- [ ] **FWUX-03**: Toggling a rule in the expanded row is immediately reflected on the Firewall page (shared SWR state, no page reload)
- [ ] **FWUX-04**: When no rules match a device, a small icon appears in the expanded row; hovering or clicking shows "No firewall rules apply to this device"

### Health / Statusz (HLTH)

- [ ] **HLTH-01**: `/api/statusz` returns a DB health check result (`SELECT 1` ping with latency ms)
- [ ] **HLTH-02**: `/api/statusz` returns a UniFi proxy reachability check using the undici Agent (scoped TLS bypass for self-signed console cert)
- [ ] **HLTH-03**: `/api/statusz` returns app version and release date from `package.json`
- [ ] **HLTH-04**: `/statusz` page shows colored status indicators for DB health, UniFi proxy, app version, and release date — no auth required

## Future Requirements

### Mapping Layer

- **MAPP-F01**: IP group resolution — resolve group IDs to member IPs and check membership. Requires unverified `/firewall-address-groups` API endpoint. HIGH complexity; deferred pending live-hardware verification.

## Out of Scope

| Feature | Reason |
|---------|--------|
| IP group membership matching | Requires separate unverified API call, CIDR containment logic, HIGH complexity — not table stakes for family home network |
| Creating new firewall rules | Only toggling existing rules — correct scope for family use (carried from v1.0) |
| Stale-IP label on IP-matched rules | Adds UI complexity; MAC matching is preferred and covers home network use case |
| Auth gate on /statusz | Ops/diagnostic use; consistent with existing /api/health pattern |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MAPP-01 | — | Pending |
| MAPP-02 | — | Pending |
| MAPP-03 | — | Pending |
| FWUX-01 | — | Pending |
| FWUX-02 | — | Pending |
| FWUX-03 | — | Pending |
| FWUX-04 | — | Pending |
| HLTH-01 | — | Pending |
| HLTH-02 | — | Pending |
| HLTH-03 | — | Pending |
| HLTH-04 | — | Pending |

**Coverage:**
- v5.0 requirements: 11 total
- Mapped to phases: 0 (roadmap not yet created)
- Unmapped: 11 ⚠️

---
*Requirements defined: 2026-07-18*
*Last updated: 2026-07-18 after initial definition*
