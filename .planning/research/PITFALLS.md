# Domain Pitfalls

**Domain:** Rule-to-device mapping — v5.0 milestone
**Researched:** 2026-07-18
**Scope:** Adding rule-to-device mapping and inline toggle to the existing Next.js 16 + UniFi dashboard

> Previous project-level pitfalls (API auth, CSRF, rate limits) are superseded by this v5.0-specific document.
> Those concerns were addressed in v1.0–v4.0. This document focuses on the new mapping layer, mock risks,
> ZBF divergence, and inline toggle sync.

---

## Critical Pitfalls

Mistakes that cause wrong data shown to users, mapping layer rewrites, or broken toggle behavior.

---

### Pitfall 1: IP Match Becomes Stale After DHCP Reassignment

**What goes wrong:** A firewall policy targets `192.168.1.106` (Nintendo Switch). The device reboots or is offline for 12+ hours. DHCP assigns that IP to a different device. The mapping layer reads the policy's static IP and the current client list; it now maps the rule to the wrong device.

**Why it happens:** `NetworkClient.ip` reflects the current DHCP lease. `FirewallPolicy` target IPs are static strings stored when the rule was created in the UniFi console. The app has no DHCP lease history — it only sees the live client list from `/stat/sta`.

**Consequences:**
- Wrong rule shown in the wrong device's expanded row (false positive mapping)
- User toggles what they think is "Block Nintendo Switch" — the rule actually restricts the wrong device
- Family member loses internet access for an unrelated reason; the cause is invisible

**Prevention:**
- Prefer MAC-based matching over IP-based matching whenever the policy exposes a MAC field
- When IP-only matching is the only option, display a staleness label in the UI: "Match is IP-based — may be stale if this device recently changed IPs"
- Never suppress this warning; a skeptical label is better than silent confidence

**Detection:** A mapped device's current IP differs from the policy target IP, but the UI shows a match with no caveat.

---

### Pitfall 2: IP Group Resolution Calls the Wrong Endpoint in ZBF Mode

**What goes wrong:** Legacy firewall rules reference IP groups stored at `GET /api/s/{site}/rest/firewallgroup` (v1 path, members in `group_members` array). Zone-based firewall (ZBF) policies may reference a different group/address object system with different IDs. Calling the v1 group endpoint to resolve a group ID from a ZBF policy either returns not-found or resolves the wrong group.

**Why it happens:** UniFi has two parallel firewall systems. The v1 API uses `firewallgroup` objects. ZBF (v2) policies have their own zone and address-object store. The exact ZBF group endpoint is not definitively documented in public sources — it requires live-hardware verification.

**Consequences:**
- Group resolution silently returns empty → device never matches group-based policies → rules are hidden when they should be shown
- Worse: a group ID collision between the two systems maps the wrong group's members to the wrong devices

**Prevention:**
- Before implementing group resolution, verify empirically against a live console whether ZBF policy objects reference legacy `firewallgroup` IDs or a ZBF-specific group entity
- Add a `getFirewallGroups()` function gated on `isZoneBasedFirewallEnabled()` that routes to the correct endpoint per mode
- If the correct ZBF group endpoint cannot be confirmed before coding, return an empty set and surface a UI notice ("Group-based matching unavailable in ZBF mode") rather than returning wrong data

**Confidence:** MEDIUM — risk is inferred from the documented API split; exact ZBF group endpoint path needs live-hardware verification (flagged in project as deferred UAT).

---

### Pitfall 3: ZBF Policies Operate on Zones, Not Individual Clients — Mapping Returns Empty for Everyone

**What goes wrong:** ZBF policies control traffic between zones (LAN → WAN, IoT → LAN, etc.). A "Block Gaming Consoles" rule in ZBF blocks all traffic from the IoT/Gaming zone, not a specific device. The mapping layer searches for a MAC or IP in the policy object but finds only `zone_id` and `matching_target: "ANY"` or `"NETWORK"`. It returns "no matching devices" for every policy, making the feature appear broken on newer firmware.

**Why it happens:** The zone-based model is architecturally different from per-device targeting. ZBF policies do support individual client targeting via `matching_target: "CLIENT"` but only when configured that way in the console — the typical rule targets a zone or network, not a client. The current mock returns `isZoneBasedFirewallEnabled() = false`, so this divergence is invisible in development.

**Consequences:**
- Mapping works in legacy mode, broken in ZBF mode → feature regresses on newer firmware
- Family members see "no rules apply to this device" for every device after a firmware upgrade — silent data loss of visibility

**Prevention:**
- The mapping logic must be mode-aware from day one. `isZoneBasedFirewallEnabled()` already exists — dispatch through it
- In ZBF mode: check `source.matching_target === "CLIENT"` before extracting client-specific fields; for zone-level rules show "Zone rule: applies to all devices in [zone name]" rather than hiding the rule
- Do not attempt a unified mapping function that silently ignores the mode difference

---

### Pitfall 4: Null IP on Offline Devices Causes Silent Match Failure

**What goes wrong:** Mapping logic tries to match `client.ip` against a policy's target IP. `NetworkClient.ip` is `string | null` — offline devices return `null`. The comparison `null === "192.168.1.106"` is `false`. The device appears in the dashboard (it's still in the clients list) but shows no applicable rules.

**Why it happens:** `getUnifiClients()` returns recently-offline clients with `ip: null`. The policy has a static IP target. The null check is easy to miss when writing `policy.targetIp === client.ip`.

**Consequences:**
- An offline device (e.g., a kid's phone that's asleep) appears to have no firewall rules — the family member incorrectly assumes the device is unrestricted

**Prevention:**
- Guard IP comparisons explicitly: `client.ip !== null && matchIp(client.ip, policy)` — never silently skip null
- Distinguish "offline device (IP unknown)" from "no rules apply" in the UI — show a badge or tooltip when `client.ip === null` explaining that IP-based rule matching is suspended

---

### Pitfall 5: CIDR Range Membership Check Implemented as String Equality

**What goes wrong:** A policy IP group contains `192.168.1.0/24` to target the entire LAN subnet. The mapping code does `group.members.includes(client.ip)` — a string comparison. `"192.168.1.0/24".includes("192.168.1.106")` is `false`. Every device on the LAN appears unmatched.

**Why it happens:** IP group members can be either single IPs (`"192.168.1.106"`) or CIDR ranges (`"192.168.1.0/24"`, `"10.0.0.0/8"`). String equality handles single IPs correctly but silently fails for CIDR ranges. The mock only uses single IPs, so this bug never surfaces in development.

**Consequences:**
- All subnet/zone-level rules are invisible in the device row mapping
- Feature appears partially working (direct IP rules match, group rules don't) — the bug is hard to notice without a known test case using CIDR

**Prevention:**
- Use a CIDR containment check for each group member: convert both the member range and the device IP to `long` integers, compare against mask
- Unit test the CIDR check explicitly: `192.168.1.105` inside `192.168.1.0/24`, `10.1.1.1` inside `10.0.0.0/8`, `172.16.0.1` outside `192.168.0.0/16`
- Avoid importing a heavy library for this; a 10-line `ipInCidr(ip, cidr)` utility is sufficient

---

### Pitfall 6: Inline Toggle and Firewall Page Get Out of Sync (SWR Key Mismatch)

**What goes wrong:** The Firewall page uses `useSWR('/api/firewall', ...)`. The device row inline toggle calls `PUT /api/firewall` but either triggers a different SWR key invalidation or doesn't call `mutate()` at all. After a toggle from the device row, the Firewall page still shows the old state. The user sees contradictory indicators.

**Why it happens:** `RuleToggle` already does the right thing — it calls `mutate('/api/firewall')` after a successful PUT. If the inline device row toggle reimplements the toggle handler instead of reusing `RuleToggle`, it may forget the `mutate()` call or use a different cache key.

**Consequences:**
- Stale UI: Firewall page and device row show opposite enabled states for the same rule
- Family member toggles a rule, thinks it's active, but the Firewall page shows it disabled → duplicate toggles → rule ends up in the wrong state

**Prevention:**
- The inline device row toggle must reuse the existing `RuleToggle` component unchanged, not copy its logic
- If the device row needs different visual styling, wrap `RuleToggle` or extract the toggle action into a shared hook (`useFirewallToggle(policyId)`) consumed by both locations
- Write a test: render both `FirewallCard` and device-row inline toggle for the same policy, trigger a toggle on one, assert both reflect the updated state after SWR revalidation

---

## Moderate Pitfalls

---

### Pitfall 7: Mock Policies Have No MAC/IP Fields — Mapping Tests Are Vacuously True

**What goes wrong:** The three mock policies (`Block Gaming Consoles`, `Pause Kids Devices`, `Guest Network Restrict`) have no source IP, MAC, or group reference fields. Any mapping function that returns "true if `policy.source_ip` matches `client.ip`" returns false for all mock policies. Tests pass with zero matches — which looks correct but tests nothing about the mapping logic.

**Why it happens:** The mock was built for Phase 5's toggle requirement, which only needs `_id`, `name`, `enabled`. Mapping fields were never added because mapping didn't exist.

**Consequences:**
- Unit tests for the mapping layer pass in mock mode but the real client returns unexpected shapes or zero matches
- Type safety gap: `FirewallPolicySchema.passthrough()` means TypeScript does not warn when mapping code accesses `policy.client_macs` — it compiles clean, but at runtime the field is `undefined`

**Prevention:**
- Update mock policies before writing mapping logic: add realistic MAC/IP/group fields that align with the mock clients
  - `Block Gaming Consoles` → references `aa:bb:cc:dd:ee:06` (Nintendo Switch) or IP `192.168.1.106`
  - `Pause Kids Devices` → references a mock group ID containing `aa:bb:cc:dd:ee:03` (Dad's iPhone) and `aa:bb:cc:dd:ee:04` (Mom's iPad)
  - `Guest Network Restrict` → direct IP target for at least one client
- Add a mock `getFirewallGroups()` function returning group objects consistent with the IDs in mock policies
- Ensure all three matching paths are exercised: direct MAC, direct IP, and group membership

---

### Pitfall 8: `passthrough()` on FirewallPolicySchema Hides Mapping Field Type Errors Until Runtime

**What goes wrong:** Mapping code accesses `(policy as any).client_macs` or relies on untyped passthrough fields. TypeScript compiles. At runtime on a real console, `client_macs` is either named differently, nested differently, or absent on this firmware version. The error appears as a silent undefined, not a thrown exception.

**Why it happens:** `FirewallPolicySchema.passthrough()` deliberately passes unknown fields through untyped. This is correct for the toggle feature (unknown fields don't matter), harmful for the mapping feature (which must consume specific fields safely).

**Prevention:**
- Define a `FirewallPolicyMappingFields` Zod schema or TypeScript interface naming exactly the fields the mapping layer expects: `source_ip`, `source_mac`, `source_group_id`, etc.
- Parse those fields with `z.object({...}).partial().safeParse(policy)` before accessing them — never access passthrough fields via bare property access
- If the field is absent from the live API response, `safeParse` returns `undefined` explicitly rather than causing a silent miss

---

### Pitfall 9: `isZoneBasedFirewallEnabled()` Called Per-Poll Instead of Cached

**What goes wrong:** The mapping layer calls `isZoneBasedFirewallEnabled()` on every mapping operation or every 60-second poll cycle. This adds an extra HTTPS round-trip to the UniFi console on every client list refresh. On a home LAN with a slow console, this can increase dashboard poll latency significantly.

**Why it happens:** In mock mode the function returns `false` synchronously at zero cost. The real client makes a network call to `/site-feature-migration`. Development never reveals the production cost.

**Prevention:**
- Cache the ZBF flag at app startup (instrumentation.ts) or attach it to the `/api/firewall` response payload so clients can consume it without a separate fetch
- Never call `isZoneBasedFirewallEnabled()` inside a per-client or per-poll loop

---

### Pitfall 10: Mapping Layer Silently Returns Empty When Group Fetch Fails

**What goes wrong:** The group resolution step (`getFirewallGroups()`) fails due to a transient network error, a 404 (endpoint doesn't exist on this firmware), or an unexpected response shape. The mapping layer catches the error, returns `[]` (no group matches). The user sees "no applicable rules" for every device.

**Why it happens:** Error state and empty state look identical to the mapping caller. A catch block that returns `[]` is indistinguishable from a policy that genuinely has no group members.

**Prevention:**
- Return a discriminated result from group resolution: `{ members: [], error: 'FETCH_FAILED' }` vs `{ members: [], error: null }`
- Propagate partial failures to the device row UI: show "Rule matching incomplete — group data unavailable" rather than silently showing zero rules

---

## Minor Pitfalls

---

### Pitfall 11: MAC Address Case Sensitivity

**What goes wrong:** The UniFi API returns MAC addresses in lowercase (`aa:bb:cc:dd:ee:01`). A policy's source MAC field may be uppercase (`AA:BB:CC:DD:EE:01`) depending on how the rule was entered in the UniFi console. String equality fails silently.

**Prevention:** Normalize all MAC addresses to lowercase before comparison. Add a `normalizeMac(mac: string): string` utility used by both the client transform in `client.ts` and the mapping layer. The mock already uses lowercase consistently — production may not.

---

### Pitfall 12: /statusz UniFi Health Check Uses `globalThis.fetch` Instead of the `undici` Agent

**What goes wrong:** The `/statusz` health check for "UniFi proxy reachability" makes an HTTPS request to the console. If it uses `globalThis.fetch` rather than the `undici` Agent from `client.ts`, it fails with a TLS certificate error (self-signed cert) and reports "unhealthy" even when all real client calls succeed.

**Why it happens:** The `undici` Agent with `rejectUnauthorized: false` is defined in `client.ts` as a module-level singleton. It is not exported. A health check written in a separate route must either import the agent explicitly or re-instantiate it.

**Prevention:** Export the `undici` Agent from `client.ts` (or from a new `src/lib/unifi/agent.ts`) so the health check can import and reuse it. Alternatively, add an exported `pingConsole()` function to the unifi module that the health check calls through the facade.

---

### Pitfall 13: Mapping Logic Lives in an API Route Instead of a Shared Library

**What goes wrong:** Rule-to-device mapping is implemented directly inside an API route handler. When the device row needs the same logic, a second implementation is written inline. The two implementations diverge over time; bug fixes apply to one but not the other.

**Prevention:** Implement mapping as a pure function in `src/lib/unifi/mapping.ts` with no Next.js dependencies. Both the API route and any Server Component call it. The function is independently unit-testable without mocking route infrastructure. This also makes mock injection trivial: `mapping.ts` takes `FirewallPolicy[]`, `NetworkClient[]`, and optional `FirewallGroup[]` as parameters.

---

## Blast Radius Summary

| Bug | What the User Sees | Severity |
|-----|-------------------|----------|
| Wrong rule shown for device (Pitfall 1, DHCP stale) | Incorrect rule visible; user toggles wrong rule | HIGH — wrong action taken |
| Correct rule hidden for device (Pitfall 2, group endpoint) | Device appears unrestricted when it isn't | HIGH — false sense of security |
| Zone rule maps to zero devices (Pitfall 3, ZBF) | No rules shown for any device in ZBF mode | HIGH — feature appears broken |
| CIDR match fails (Pitfall 5) | Group-based rules never show | MEDIUM — silent but visible gap |
| Toggle state divergence (Pitfall 6, SWR) | Firewall page and device row disagree | MEDIUM — confusing, can cause double-toggle |
| Mock has no mapping fields (Pitfall 7) | Tests pass vacuously; real client broken | MEDIUM — silent test gap |

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Update mock before mapping logic | Mock policies have no mapping fields (Pitfall 7) | Update mock first — it defines the contract for unit tests |
| Mapping library implementation | CIDR string equality bug (Pitfall 5) | Write CIDR unit tests before integrating with UI |
| Mapping library implementation | Group endpoint mismatch in ZBF mode (Pitfall 2) | Gate on `isZoneBasedFirewallEnabled()`; stub if unconfirmed |
| ZBF handling in mapping | Zone policies never match clients (Pitfall 3) | Define a separate ZBF display path from day one |
| TypeScript safety | passthrough fields accessed without validation (Pitfall 8) | Define `FirewallPolicyMappingFields` schema; use `safeParse` |
| Inline toggle in device row | SWR key mismatch (Pitfall 6) | Reuse `RuleToggle` component, never copy its handler |
| /statusz health page | UniFi health check uses wrong fetch client (Pitfall 12) | Export undici agent or add `pingConsole()` to facade |
| Performance of ZBF flag check | `isZoneBasedFirewallEnabled()` called per poll (Pitfall 9) | Cache at startup or include in firewall API response |

---

## Sources

- [UniFi Zone-Based Firewalls — Ubiquiti Help Center](https://help.ui.com/hc/en-us/articles/115003173168-Zone-Based-Firewalls-in-UniFi) — MEDIUM confidence
- [Migrating to Zone-Based Firewalls — Ubiquiti Help Center](https://help.ui.com/hc/en-us/articles/28223082254743-Migrating-to-Zone-Based-Firewalls-in-UniFi) — MEDIUM confidence
- [unifi.firewall.Rule — Pulumi Registry](https://www.pulumi.com/registry/packages/unifi/api-docs/firewall/rule/) — MEDIUM confidence (Pulumi provider wraps UniFi API; field names may differ from raw JSON)
- [unifi.firewall.Group — Pulumi Registry](https://www.pulumi.com/registry/packages/unifi/api-docs/firewall/group/) — MEDIUM confidence
- [Ubiquiti Community Wiki — API Endpoints](https://ubntwiki.com/products/software/unifi-controller/api) — MEDIUM confidence (community-maintained; accurate for v1 endpoints)
- [ZBF source `matching_target` field — deepwiki/enuno/unifi-mcp-server](https://deepwiki.com/enuno/unifi-mcp-server/5.5-zone-based-firewall) — LOW confidence (secondary doc, field names unverified against live console)
- [Home Assistant UniFi integration endpoint issue #139504](https://github.com/home-assistant/core/issues/139504) — HIGH confidence for v1 vs v2 endpoint split behavior
- Codebase analysis: `src/lib/unifi/types.ts`, `src/lib/unifi/mock.ts`, `src/lib/unifi/client.ts`, `src/components/firewall/rule-toggle.tsx` — HIGH confidence (primary source, directly inspected)
