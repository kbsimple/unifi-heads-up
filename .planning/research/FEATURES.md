# Feature Research

**Domain:** Network Monitoring Dashboard (Home/Consumer)
**Researched:** 2026-04-14
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Device List** | Basic visibility — users expect to see what's on their network | LOW | UniFi API provides client devices endpoint; needs name resolution, grouping |
| **Real-Time Status** | "Is my internet working?" — fundamental question | LOW | Traffic status (high/medium/low/idle) covers this; polling every 5 min sufficient |
| **Device Naming** | Users want to identify devices by name, not MAC | MEDIUM | UniFi allows device names; fallback to hostname, then MAC |
| **Bandwidth Visibility** | "Who's using the internet?" — core monitoring question | MEDIUM | UniFi Flow Insights or client stats API; 5-min rolling average |
| **Simple Authentication** | Private dashboard needs access control | LOW | Family household = simple auth, not enterprise SSO |
| **Mobile-Friendly UI** | Home users check from phones, not just desktops | MEDIUM | Responsive design, touch-friendly controls |
| **Clear Visual Indicators** | Red/yellow/green status at a glance | LOW | Color coding for traffic levels; semantic colors for status |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Device Groups** | Organize devices by family member, function (kids, IoT, work) | MEDIUM | Custom grouping not in UniFi native; adds significant value for families |
| **Group Traffic Aggregation** | See "Kids" bandwidth as aggregate, not just per-device | MEDIUM | Requires device groups first; simplifies at-a-glance monitoring |
| **Firewall Rule Toggling** | Pause internet for groups without complex firewall UI | HIGH | UniFi API supports rule enable/disable; major UX improvement over native UI |
| **Simple UX for Non-Technical Users** | Parents/grandparents can use it, not just network admins | MEDIUM | This is the key differentiator — UniFi native UI is complex |
| **Historical Trend View** | See if bandwidth has been high for past hour/day | MEDIUM | UniFi API provides historical data; useful for spotting patterns |
| **Threshold Defaults** | Pre-configured "high/medium/low" removes configuration burden | LOW | Smart defaults for home networks (high >100Mbps, etc.) |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-Time WebSocket Streaming** | "I want live updates" | 5-min averages don't benefit from real-time; adds complexity, connection management, reconnect logic; UniFi API doesn't support WebSocket for client stats | Polling with 30-60s refresh is sufficient |
| **Create New Firewall Rules** | "I want to block new things" | Firewall rule creation is complex (source/dest/ports/protocols); one mistake can break network access; requires networking knowledge | Toggle existing rules — user pre-configures in UniFi native UI |
| **Per-Device Threshold Customization** | "I want different thresholds per device" | Configuration explosion; maintenance burden; users don't actually need it for home use | Smart defaults cover 95% of use cases; add if validated later |
| **Alert Notifications (Email/Push)** | "Tell me when something happens" | Alert fatigue for home users; thresholds constantly change; "set and forget" leads to ignored alerts | Dashboard check is sufficient; add notifications only if users request it |
| **Deep Network Diagnostics** | "I want ping, traceroute, DNS lookup" | Debugging tools for network engineers; overwhelms non-technical users; they don't know what to do with results | Keep it simple: status visibility, not diagnostic tools |
| **Bandwidth Limiting/Throttling** | "I want to limit my kid's bandwidth" | UniFi supports this but requires QoS setup; complex to configure correctly; often misconfigured | Use firewall toggles (pause) or UniFi native UI for QoS |
| **Multiple User Roles** | "Admin vs. viewer roles" | Over-engineering for family use; adds permission complexity | Single auth level for family; if needed later, add then |

## Feature Dependencies

```
[Device Groups]
    └──requires──> [Device List]
    └──enables───> [Group Traffic Aggregation]
                       └──requires──> [Bandwidth Visibility]

[Firewall Rule Toggling]
    └──requires──> [Authentication] (private dashboard)
    └──requires──> [UniFi API Integration]

[Historical Trend View]
    └──requires──> [Bandwidth Visibility]
    └──requires──> [Data Storage] (even if minimal caching)

[Simple UX for Non-Technical Users]
    └──depends on──> [Clear Visual Indicators]
    └──depends on──> [Mobile-Friendly UI]
    └──conflicts with──> [Deep Network Diagnostics]

[Threshold Defaults]
    └──enables───> [Real-Time Status] (no config needed)
```

### Dependency Notes

- **Device Groups requires Device List**: Cannot group devices without first listing them from the API
- **Group Traffic Aggregation requires Device Groups**: Aggregation needs a grouping concept to exist first
- **Firewall Rule Toggling requires Authentication**: Toggling firewall rules is destructive; must be authenticated
- **Firewall Rule Toggling requires UniFi API Integration**: Needs API access to UniFi controller to modify rules
- **Historical Trend View requires Data Storage**: Even minimal historical view needs some form of data persistence or caching
- **Simple UX conflicts with Deep Network Diagnostics**: These are fundamentally different user experiences; keep separate or hide diagnostics

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Device List** — Essential: Users must see what devices are on their network
- [ ] **Real-Time Status (Traffic Levels)** — Essential: Core value proposition — "at-a-glance" traffic status
- [ ] **Device Naming** — Essential: Device identification without MAC addresses
- [ ] **Simple Authentication** — Essential: Private dashboard needs access control
- [ ] **Mobile-Friendly UI** — Essential: Home users check from phones
- [ ] **Clear Visual Indicators** — Essential: Red/yellow/green status at a glance

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Device Groups** — Trigger: Users request organizing devices by family member or function
- [ ] **Group Traffic Aggregation** — Trigger: Device Groups are implemented; users want group-level visibility
- [ ] **Firewall Rule Toggling** — Trigger: Users want to pause internet for specific devices/groups without complex UniFi UI
- [ ] **Historical Trend View** — Trigger: Users ask "was bandwidth high an hour ago?" or "when did this start?"

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Per-Device Threshold Customization** — Defer: Not validated as needed; smart defaults cover most cases
- [ ] **Alert Notifications** — Defer: Requires user configuration, rate limiting, delivery infrastructure
- [ ] **Bandwidth Limiting/Throttling** — Defer: Complex QoS setup; high risk of misconfiguration
- [ ] **Multiple User Roles** — Defer: Over-engineering for family use

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Device List | HIGH | LOW | P1 |
| Real-Time Status | HIGH | LOW | P1 |
| Device Naming | HIGH | LOW | P1 |
| Simple Authentication | HIGH | MEDIUM | P1 |
| Mobile-Friendly UI | HIGH | MEDIUM | P1 |
| Clear Visual Indicators | HIGH | LOW | P1 |
| Device Groups | MEDIUM | MEDIUM | P2 |
| Group Traffic Aggregation | MEDIUM | MEDIUM | P2 |
| Firewall Rule Toggling | HIGH | HIGH | P2 |
| Historical Trend View | MEDIUM | MEDIUM | P2 |
| Per-Device Thresholds | LOW | MEDIUM | P3 |
| Alert Notifications | MEDIUM | HIGH | P3 |
| Bandwidth Limiting | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | UniFi Native UI | This Dashboard | Our Approach |
|---------|-----------------|----------------|---------------|
| Device List | Full table with all metrics | Simplified, traffic-focused | Hide complexity, show status |
| Traffic Status | Detailed graphs, technical metrics | High/Medium/Low/Idle | Family-friendly, at-a-glance |
| Device Groups | Requires VLAN/Object config | Simple grouping UI | Zero network config required |
| Firewall Rules | Full firewall management | Toggle existing rules only | Simpler, less dangerous |
| Bandwidth Limits | QoS config, traffic rules | (Not in v1) | Defer — let native UI handle |
| Historical Data | Full analytics suite | 24-hour trend view | Simpler, focused on status |
| Authentication | Enterprise SSO, LDAP | Simple family auth | Household-appropriate |

## Anti-Patterns Avoided

Based on dashboard best practices research:

| Anti-Pattern | Why Avoided | Our Approach |
|--------------|-------------|--------------|
| **Alert Fatigue** | Home users don't want constant notifications | Dashboard check model, not push alerts |
| **Data Overload** | Non-technical users can't parse complex metrics | Simplified status (H/M/L/Idle), not raw Mbps |
| **Green Dashboard, Angry Users** | Internal metrics don't match user experience | Traffic status is what users care about |
| **Copy-Paste Dashboards** | Generic templates don't match specific needs | Purpose-built for family network monitoring |
| **Monitoring Wrong Metrics** | CPU/memory don't matter to home users | Focus on bandwidth and connectivity |

## Sources

- [Network Monitoring Dashboard Best Practices (MoldStud)](https://moldstud.com/articles/p-best-practices-and-tools-for-building-a-network-monitoring-dashboard)
- [8 Network Monitoring Best Practices for 2025 (Clouddle)](https://clouddle.com/network-monitoring-best-practices/)
- [Network Dashboard Design (Paessler)](https://blog.paessler.com/network-dashboard-design-turning-data-chaos-into-team-focused-insights)
- [UniFi Network 9.3 Features](https://blog.ui.com/article/introducing-network-9-3)
- [UniFi Network 9.4 Features](https://blog.ui.com/article/releasing-unifi-network-9-4)
- [UniFi Network 9.5 Features](https://blog.ui.com/article/releasing-unifi-network-9-5)
- [pfSense vs UniFi Comparison](https://medium.com/@planedrop/pfsense-vs-unifi-in-depth-testing-and-experience-cce36ab72441)
- [UniFi API Documentation](https://developer.ui.com/site-manager-api/list-sites)
- [UniFi API Getting Started](https://help.ui.com/hc/en-us/articles/30076656117655-Getting-Started-with-the-Official-UniFi-API)
- [Site Manager Remote Management](https://help.ui.com/hc/en-us/articles/20680072882967-UniFi-Remote-Management-via-Site-Manager)
- [10 Monitoring Anti-Patterns (FlareWarden)](https://flarewarden.com/insights/monitoring-anti-patterns)
- [Dashboard Anti-Patterns (StartingBlock)](https://startingblockonline.org/dashboard-anti-patterns-12-mistakes-and-the-patterns-that-replace-them/)
- [10 Common Network Monitoring Mistakes (Galactis)](https://www.galactis.ai/resources/blog/10-common-network-monitoring-mistakes-to-avoid-2026)
- [React Firewall Rules Dashboard (shadcn.io)](https://www.shadcn.io/blocks/dashboard-firewall-rules)
- [Family Parental Control Apps (TechTimes)](https://www.techtimes.com/articles/315395/20260325/best-parental-control-apps-manage-screentime-web-risks-social-media-kids-devices.htm)

---
*Feature research for: Network Monitoring Dashboard (Home/Consumer)*
*Researched: 2026-04-14*