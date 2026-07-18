# Feature Landscape — v5.0 Streamlining Management UX Flows

**Domain:** Home Network Management Dashboard (rule-to-device mapping + inline controls + health UI)
**Researched:** 2026-07-18
**Overall confidence:** HIGH (codebase read + aiounifi model confirmed + UniFi API verified)

---

## Table Stakes

Features users expect from v5.0. Missing any of these makes the milestone feel incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Rule-to-device mapping (MAC) | Users want "does this device have a rule on it?" | MEDIUM | `source.client_macs[]` in ZBF policies; `srcMac` in legacy rules |
| Rule-to-device mapping (IP) | Some rules target a specific IP, not MAC | MEDIUM | `srcAddress` in legacy API; ZBF targets zones not IPs — de-emphasize |
| Inline toggle in expanded device row | Core value of v5.0; avoids nav to Firewall page | MEDIUM | Reuse `RuleToggle` component; add compact list below traffic chart |
| "No rules apply" empty state | Users need to know the feature worked, not just nothing showed | LOW | Show one-liner — do not hide section entirely |
| /statusz page with DB + proxy status | Health visibility — required for self-hosted ops | LOW | Extend existing `/api/statusz` endpoint; add new `/statusz` page |

---

## Differentiators

Features that give this milestone tangible value beyond the baseline.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| IP group / network membership matching | Catches rules that apply indirectly (e.g., "all 192.168.1.x devices") | HIGH | Requires second API call to `/rest/firewallgroup`; legacy API only |
| Rule count badge on device row | At-a-glance "this device has 2 rules" before expanding | LOW | Display count after mapping runs; badge in collapsed row |
| Matched-rule name as link to Firewall page | One-click deep-link for power users | LOW | Append `?highlight=<policyId>` to /firewall link |
| Mock data support for mapping | Inline toggle works in dev (`UNIFI_MOCK=true`) without real console | MEDIUM | Extend mock to add `source.client_macs` fields to some policies |

---

## Anti-Features

Features to explicitly not build in v5.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Schedule picker in inline view | Adds cognitive load to a simple "pause this device" action; power-user feature belongs on Firewall page | Show toggle only in inline view; link "See all rules" to /firewall for advanced controls |
| Zone-based matching display | ZBF zones are network-level (LAN→WAN), not device-level; showing zone rules as "applying" to a device is misleading | Only show rules that explicitly reference the device by MAC or IP |
| Real-time rule-match refresh | Rule membership doesn't change second-by-second; polling adds complexity | Fetch rule mapping once on row expand; refresh on next expand |
| Creating new firewall rules from device row | Out of scope for the project; dangerous without full rule context | Toggle-only; link to UniFi console for rule creation |
| "Apply a rule" action from device row | Same risk as above | Toggle only — the rule must pre-exist |

---

## Rule-to-Device Matching Strategy

### What the UniFi API Exposes

The app currently uses the `/proxy/network/v2/api/site/default/firewall-policies` endpoint (ZBF style). The existing `FirewallPolicySchema` uses `.passthrough()`, so `source` and `destination` fields are already returned but not extracted.

**ZBF policy source/destination structure (confirmed via aiounifi model):**

```
source: {
  matching_target: string      // e.g. "ANY", "CLIENT", "ZONE", "IP"
  zone_id: string              // network zone — not device-specific
  client_macs?: string[]       // list of MAC addresses when targeting specific clients
  port_matching_type: string
  match_opposite_ports: boolean
}
```

**Legacy firewallrule (pre-ZBF) fields from Pulumi registry — confirmed HIGH confidence:**

```
srcMac: string                 // exact MAC address
srcAddress: string             // IPv4 address or CIDR
srcFirewallGroupIds: string[]  // references to firewallgroup objects
srcNetworkId: string           // network/VLAN ID
dstAddress, dstFirewallGroupIds, dstNetworkId (same pattern)
```

### Matching Priority Order (implement in this order)

1. **MAC match (ZBF):** `source.client_macs` includes `device.mac` — highest confidence, directly device-targeted
2. **MAC match (legacy):** `srcMac === device.mac`
3. **IP match (legacy):** `srcAddress === device.ip` (exact) or CIDR containment if device.ip non-null
4. **IP group match (legacy):** fetch `/rest/firewallgroup`, check if `device.ip` is in any group referenced by `srcFirewallGroupIds` — expensive, do as best-effort

### What pfSense and OPNsense Do (for comparison)

Neither pfSense nor OPNsense has a native "show which rules apply to this device" UI. Rules are managed globally per-interface; matching a device to its rules requires reading all rules and filtering by source/destination alias membership. This app is building something that doesn't exist in the open-source alternatives — it's a genuine differentiator. The implementation pattern of "fetch all policies, filter client-side by MAC/IP" is the right approach.

### Handling the ZBF vs Legacy Ambiguity

The app already calls `isZoneBasedFirewallEnabled()` at startup. In ZBF mode:
- Most policies are zone-to-zone (e.g., LAN→WAN, all devices in zone); these should NOT be shown per-device
- Only policies with `source.client_macs` populated target specific devices
- In legacy mode: use `srcMac`, `srcAddress`, `srcFirewallGroupIds`

Rule: only surface a policy in the inline view if it has explicit device-level targeting. Zone-level policies that apply broadly to all LAN devices are not useful to show per-device.

### Dynamic IP Problem

Devices can get new DHCP leases. IP-based rule matching reflects the current lease, not history. MAC matching is always preferred. This is a known limitation — document it, but don't try to solve it in v5.0.

---

## Inline Firewall Shortcut UI

### Layout within the Expanded Device Row

The expanded row currently shows:
```
[Traffic history label]    [Window selector: 1h / 6h / 24h / 7d]
[Traffic chart — full width]
```

For v5.0, add below the chart:

```
[Traffic history label]    [Window selector]
[Traffic chart — full width]

─────────────────────────────────
Firewall Rules (2 rules apply)

  Block Gaming Consoles     [toggle switch]
  Pause Kids Devices        [toggle switch]

  See all rules →
─────────────────────────────────
```

### Design Decisions for Non-Technical Family Users

**Use compact list rows, not cards.** Cards (like FirewallCard) have too much chrome for inline display. A simple `flex` row with rule name on the left and a Switch on the right is sufficient.

**Show rule name only.** No badge, no star, no schedule picker in the inline view. The full FirewallCard experience lives on the /firewall page.

**Always show the section.** When the section loads and finds no matching rules, show: "No firewall rules apply to this device." This prevents the user from thinking the feature is broken or missing.

**Loading state.** Show a small skeleton or "Loading rules..." while the mapping fetch is in progress. The mapping is a separate async fetch triggered on row expand.

**"See all rules" link.** A text link at the bottom of the section pointing to `/firewall`. Gives power users an escape hatch without cluttering the inline view.

**Toggle behavior.** Reuse the existing `RuleToggle` component and its `/api/firewall` PUT endpoint. After toggle, revalidate the firewall SWR cache — same behavior as the Firewall page. No need to refresh the client table.

### Fetch Trigger and Caching

Fetch the device's matched rules on row expand, keyed by device MAC (same pattern as the history chart fetch). Cache the result in component state during the session. Do not refetch on every poll cycle — rule membership is stable.

New API endpoint needed: `GET /api/firewall/device-rules?mac=<mac>` — returns the subset of policies that match the device. This keeps matching logic server-side and off the client.

---

## /statusz Health Page

### What Exists Today

The existing `/api/statusz` endpoint returns:
```json
{
  "uptime": 3600,
  "buildId": "abc123",
  "nodeVersion": "v22.0.0",
  "memoryMb": 128,
  "nodeEnv": "production"
}
```

Missing: DB connectivity check, UniFi proxy reachability.

### Table Stakes Health Checks

| Check | Why It Matters | How to Implement |
|-------|---------------|-----------------|
| DB connectivity | If SQLite is locked/corrupted, snapshots fail silently | Run `SELECT 1` query; report ok/error + latency |
| UniFi proxy reachability | Core feature fails if console unreachable | HEAD request to `${UNIFI_HOST}` with short timeout (2s); report ok/error + latency |
| App version / build ID | Needed to confirm deployment succeeded | Already in statusz; keep |
| Uptime | Tells ops if the app has restarted | Already in statusz; keep |

### Nice-to-Have Health Checks

| Check | Value | Complexity |
|-------|-------|------------|
| Mock mode indicator | Shows whether UNIFI_MOCK=true is active | LOW — check env var |
| Memory RSS | Spot memory leaks | Already in statusz; keep |
| Last successful DB snapshot time | Confirm recording is working | MEDIUM — query max(recorded_at) from snapshots |
| Node version | Debugging info | Already in statusz; keep |

### /statusz Page UI Pattern

Simple vertical stack of status rows. Green dot = ok, red dot = error. Non-technical users see "Everything is working" or "Something is wrong — contact your admin." Technical users see the detail.

```
DB             [green] OK (2ms)
UniFi Console  [green] OK (45ms)
Version        abc123 (production)
Uptime         2h 14m
Mock Mode      Off
```

No historical graphs, no time series, no refresh button needed — auto-refresh on a short interval (10s) is sufficient. The page should not require authentication (consistent with existing `/api/health` which is unauthenticated for Docker health probes), OR require auth if the team prefers. Either is acceptable; keeping it unauthenticated is simpler.

---

## Feature Dependencies

```
[Rule-to-device mapping API]
    └──requires──> [Firewall policies fetch] (already exists)
    └──enables───> [Inline firewall shortcut]
                       └──requires──> [RuleToggle component] (already exists)
                       └──requires──> [GET /api/firewall/device-rules endpoint] (new)

[/statusz page UI]
    └──requires──> [Extended /api/statusz endpoint] (DB + proxy checks)
    └──is independent of──> [Rule mapping]
```

---

## MVP Recommendation for v5.0

Build in this order:

1. **Extend `/api/statusz`** — Add DB check (SELECT 1) and UniFi proxy check (HEAD request). Low risk, independent, tests the deployment health story first. Time: ~2h.

2. **Create `/statusz` page** — Static SSR page reading from the extended endpoint. Non-technical UI: colored dots, simple labels. Time: ~2h.

3. **Server-side rule mapping function** — Pure function `matchPolicies(mac, ip, policies)` that filters policies by MAC/IP match. No IP group lookup in v5.0 (defer). Covered by unit tests. Time: ~3h.

4. **`GET /api/firewall/device-rules?mac=<mac>` endpoint** — Fetches all policies, runs mapping function, returns matched subset. Time: ~2h.

5. **Inline firewall section in `client-table.tsx`** — Adds a new section below the traffic chart in the expanded row. Fetches from `/api/firewall/device-rules`. Shows compact rule list or empty state. Reuses `RuleToggle`. Time: ~4h.

6. **Mock data update** — Add `source.client_macs` to some mock policies to wire up the inline view in dev mode. Time: ~1h.

Defer IP group membership lookup (extra API call to `/rest/firewallgroup`) to a follow-on. MAC + exact IP matching covers the most common home-network rule patterns.

---

## Edge Cases and Expected Behaviors

| Scenario | Expected Behavior |
|----------|-----------------|
| Device has no matching rules | Show "No firewall rules apply to this device." below chart. Do not hide the section. |
| Device IP is null (no DHCP lease) | MAC-only matching; skip IP checks. Show matched rules or empty state. |
| Device IP changes (DHCP re-lease) | Next row expand re-fetches; stale match shown until then. Acceptable. |
| Rule fetch fails (network error) | Show "Unable to load rules for this device. Try again." with retry link. |
| All rules are zone-level (ZBF, no client_macs) | Empty state: "No firewall rules are configured for this specific device." |
| Many rules match (>5) | Show all — do not paginate. Home networks rarely have more than 5 device-targeted rules. If it happens, a scrollable inline list is sufficient. |
| Toggle fails from inline view | Same behavior as main Firewall page: error toast, switch reverts, SWR invalidates. |
| `/statusz` DB check fails | Red dot, error message. Page still renders (don't throw on failed check). |
| `/statusz` UniFi check fails | Red dot for UniFi row; green for DB row. Independent checks. |

---

## Sources

- aiounifi library `firewall_policy.py` (Kane610/aiounifi, master) — HIGH confidence: confirmed `source.client_macs?: list[str]` field in FirewallPolicyEndpoint TypedDict
- Pulumi UniFi Registry `firewall/rule` — HIGH confidence: confirmed legacy `srcMac`, `srcAddress`, `srcFirewallGroupIds` fields
- UniFi community: "Firewall Policy source Mac address" thread — MEDIUM confidence: confirmed MAC-based policy targeting is supported in newer firmware
- OPNsense documentation (docs.opnsense.org/manual/firewall.html) — HIGH confidence: confirmed no native per-device rule view; alias-based matching is the standard
- Project codebase: `src/lib/unifi/types.ts`, `src/lib/unifi/client.ts`, `src/components/dashboard/client-table.tsx`, `src/app/api/statusz/route.ts` — HIGH confidence (primary source)
- Web search: Ubiquiti zone-based firewall docs (help.ui.com) — HIGH confidence: confirmed ZBF uses zone_id not IP addresses for broad policies
