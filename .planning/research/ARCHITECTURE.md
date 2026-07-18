# Architecture Patterns

**Domain:** Next.js full-stack app — UniFi LAN API integration
**Milestone:** v5.0 — Rule-to-Device Mapping + Firewall Shortcut + /statusz
**Researched:** 2026-07-18
**Confidence:** HIGH (based on direct code inspection of the live codebase)

---

## Existing Architecture (as-built)

The app is already live and deviates somewhat from the original research ARCHITECTURE.md (which was written before implementation began). The actual patterns in the codebase:

```
Browser
  |
  |--- SWR polling (60s) ---> /api/clients       GET  (ClientList, ClientTable)
  |--- SWR polling (60s) ---> /api/firewall      GET  (FirewallList)
  |--- on expand -----------> /api/insights/device-history?mac=...&window=... (ClientTable)
  |--- on star toggle ------> /api/firewall/starred POST (FirewallList)
  |--- on rule toggle ------> /api/firewall      PUT  (RuleToggle)

Server (Next.js App Router)
  |
  |--- src/lib/unifi/index.ts (facade)
  |     |--- UNIFI_MOCK=true  --> src/lib/unifi/mock.ts
  |     |--- UNIFI_MOCK=false --> src/lib/unifi/client.ts
  |           |--- getUnifiClients()        -> undici fetch /stat/sta
  |           |--- getFirewallPolicies()    -> undici fetch /firewall-policies
  |           |--- updateFirewallPolicy()   -> undici GET + PUT /firewall-policies/{id}
  |           |--- isZoneBasedFirewallEnabled() -> undici fetch /site-feature-migration
  |
  |--- SQLite (better-sqlite3) for bandwidth snapshots, starred rules, insights
```

### Key Existing Patterns

**Toggle mutation chain** (how rule toggles work today):
```
RuleToggle (client component)
  → PUT /api/firewall { policyId, enabled }
  → route.ts calls updateFirewallPolicy(policyId, enabled)
  → on success: mutate('/api/firewall')   [SWR global cache invalidation]
```

**Lazy on-expand fetch** (how device history works today):
```
ClientTable (client component)
  → row expand triggers useEffect
  → fetch /api/insights/device-history?mac=...&window=...
  → stores result in component-local Map { "${mac}:${window}": HistoryBucket[] }
```

These two patterns are the templates for v5.0 features.

---

## v5.0 Integration Architecture

### Feature 1: Rule-to-Device Mapping + Inline Toggle

#### Where does the mapping logic live?

**Answer: `src/lib/unifi/mapping.ts` — a new pure library function.**

The mapping logic is a pure function: `(policies, addressGroups, device) => FirewallPolicy[]`. It does not need network access, database access, or React context. It belongs in the lib layer alongside other UniFi domain logic.

Do not co-locate it with the API route or the client fetch — those are data plumbing layers. Mapping is business logic and should be unit-testable in isolation.

#### Does IP group membership require a separate fetch?

**Answer: Yes. A new `getAddressGroups()` function is needed.**

UniFi firewall policies reference address groups by ID in source/destination fields. The `FirewallPolicySchema` uses `.passthrough()`, so the raw `source` and `destination` objects are preserved in the response — but they contain group IDs, not group members. The address group contents (which IPs/MACs belong to each group) live at a separate endpoint.

Confirmed endpoint pattern from the existing v2 API base URL structure:
```
GET /proxy/network/v2/api/site/default/firewall-address-groups
```

This must be added as a new exported function in `client.ts`, mocked in `mock.ts`, and exported from `index.ts`.

The address groups fetch composes with `getFirewallPolicies()` via `Promise.all` inside the new API route — they are independent and should run in parallel.

#### New API route: `GET /api/firewall/device-rules`

```
GET /api/firewall/device-rules?mac=aa:bb:cc:dd:ee:01&ip=192.168.1.101
→ returns FirewallPolicy[] matching that device
```

This route:
1. Verifies session (same pattern as existing routes)
2. `Promise.all([getFirewallPolicies(), getAddressGroups()])`
3. Calls `mapPoliciesToDevice(policies, groups, { mac, ip })`
4. Returns matched policies array

#### How should the expanded device row get its matched rules?

**Answer: Client-side fetch on expand, using the same lazy useEffect pattern as device history.**

The dashboard page already fetches clients at server render time. Firewall data is NOT fetched at page load — it's only needed when a row is expanded. Adding firewall data to the page-level server fetch would add 2 API calls to every dashboard load, for a feature that's only accessed on demand.

The existing `ClientTable` component already has the lazy-fetch infrastructure (useEffect + component-local state map). The device-rules fetch follows the same pattern:

```typescript
// Inside ClientTable, when a row expands:
const deviceRulesKey = expandedMac 
  ? `/api/firewall/device-rules?mac=${expandedMac}&ip=${expandedIp}` 
  : null

// SWR is cleaner here than manual useEffect (unlike history which uses window param):
const { data: deviceRules } = useSWR(deviceRulesKey, fetcher)
```

Note: Use SWR for device-rules (not useEffect + local state map) because the key is simple (mac + ip, no window param) and SWR gives automatic cache invalidation after toggle.

#### How do we ensure toggling a rule in the device row updates the Firewall page?

**Answer: Extend `RuleToggle` with an optional `extraMutateKeys` prop.**

The existing `RuleToggle` calls `mutate('/api/firewall')` after a successful toggle. The Firewall page's `FirewallList` is subscribed to `/api/firewall` via SWR and will pick up this invalidation automatically. No changes needed to the Firewall page.

The device row needs an additional cache invalidation: it must also invalidate its own SWR key (`/api/firewall/device-rules?mac=...&ip=...`) so the matched rules panel refreshes with the new enabled state.

Minimal change to `RuleToggle`:

```typescript
interface RuleToggleProps {
  policy: FirewallPolicy
  extraMutateKeys?: string[]   // NEW — optional additional SWR keys to invalidate
}

// In handleToggle, after mutate('/api/firewall'):
for (const key of (extraMutateKeys ?? [])) {
  await mutate(key)
}
```

The device row passes `extraMutateKeys={[deviceRulesKey]}`. The Firewall page does not pass `extraMutateKeys` (undefined = no change to existing behavior).

Do NOT use `revalidatePath` or Server Actions for toggle — the existing PUT `/api/firewall` route + SWR invalidation is the correct pattern for this app. Do not duplicate the toggle logic.

---

### Feature 2: /statusz Health Page

The `/api/statusz` endpoint exists and returns `{ uptime, buildId, nodeVersion, memoryMb, nodeEnv }`. The milestone requires adding DB connectivity and UniFi proxy reachability to this response.

**API route extension:**

```
GET /api/statusz
→ currently: { uptime, buildId, nodeVersion, memoryMb, nodeEnv }
→ after:    { uptime, buildId, nodeVersion, memoryMb, nodeEnv,
               db: { ok: boolean, error?: string },
               unifi: { ok: boolean, latencyMs?: number, error?: string } }
```

The DB check is a simple `SELECT 1` on the existing SQLite db. The UniFi check is a lightweight ping — either a HEAD to the console's base URL or the existing `site-feature-migration` endpoint with a short timeout. The `/api/statusz` route is unauthenticated (same as `/api/health`).

**New page:**

```
src/app/statusz/page.tsx    — Server Component, reads from /api/statusz, renders status table
```

No authentication required on the statusz page (it's an ops/health page). This is consistent with the existing `/api/health` pattern.

---

## File Map: New vs Modified

### New Files

| File | What |
|------|------|
| `src/lib/unifi/mapping.ts` | Pure function: `mapPoliciesToDevice(policies, groups, device)` |
| `src/app/api/firewall/device-rules/route.ts` | GET handler: session verify → fetch → map → respond |
| `src/app/statusz/page.tsx` | Server Component page for health status display |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/unifi/types.ts` | Add `AddressGroup` Zod schema + type. Add typed `source`/`destination` fields to `FirewallPolicySchema` (can keep passthrough but add explicit fields for the matching logic to use). |
| `src/lib/unifi/client.ts` | Add `getAddressGroups()` function |
| `src/lib/unifi/mock.ts` | Add mock address groups + `getAddressGroups()` mock that returns groups matching the mock policies |
| `src/lib/unifi/index.ts` | Export `getAddressGroups` |
| `src/components/dashboard/client-table.tsx` | Add device-rules SWR fetch in expanded row; render matched rules with `RuleToggle` + "Manage all rules →" link |
| `src/components/firewall/rule-toggle.tsx` | Add optional `extraMutateKeys?: string[]` prop |
| `src/app/api/statusz/route.ts` | Add `db` and `unifi` health checks to response |

---

## Data Flow Diagrams

### Rule-to-Device Match Flow

```
[User expands device row in ClientTable]
         |
         v
[SWR: GET /api/firewall/device-rules?mac=aa:bb:cc:dd:ee:01&ip=192.168.1.101]
         |
         v
[route.ts: verify session]
         |
         v
[Promise.all([getFirewallPolicies(), getAddressGroups()])]
         |
         v
[mapPoliciesToDevice(policies, groups, { mac, ip })]
         |
         v
[Returns: FirewallPolicy[] — matched policies only]
         |
         v
[ClientTable renders: rule name + RuleToggle for each match]
         |
         v
[If no matches: section hidden (no empty state noise — per acceptance criteria)]
```

### Toggle-from-Device-Row → Firewall Page Sync

```
[User toggles rule in expanded device row]
         |
         v
[RuleToggle: PUT /api/firewall { policyId, enabled }]
         |
         v
[route.ts: updateFirewallPolicy(policyId, enabled)]
         |
         v
[mutate('/api/firewall')]                  [mutate('/api/firewall/device-rules?mac=...&ip=...')]
         |                                           |
         v                                           v
[FirewallList refreshes]              [Device row matched rules refresh]
[on /dashboard/firewall]              [in expanded ClientTable row]
```

---

## Component Boundaries After v5.0

| Component | Responsibility | New in v5.0? |
|-----------|---------------|--------------|
| `src/lib/unifi/mapping.ts` | Pure matching logic: policy × device × address groups | NEW |
| `src/app/api/firewall/device-rules/route.ts` | Server-side match endpoint | NEW |
| `src/app/statusz/page.tsx` | Health status UI | NEW |
| `src/lib/unifi/client.ts::getAddressGroups()` | Fetch address group members from UniFi | NEW function in existing file |
| `ClientTable` (expanded row) | Render matched rules + `RuleToggle` per match | MODIFIED |
| `RuleToggle` | Toggle + multi-key SWR invalidation | MODIFIED (additive) |
| `src/app/api/statusz/route.ts` | DB + UniFi health check response | MODIFIED |

---

## Mapping Logic: What to Match

The `mapPoliciesToDevice()` function must handle three match patterns observed in UniFi ZBF policies (based on the passthrough fields the real API returns):

| Pattern | Field | Match condition |
|---------|-------|----------------|
| Direct IP | `source.matching_target === "IP"` | `source.ip_address === device.ip` |
| Direct MAC | `source.matching_target === "MAC_ADDRESS"` | `source.mac_address.toLowerCase() === device.mac.toLowerCase()` |
| Address group | `source.matching_target === "OBJECT"` | look up `source.address_group_id` in groups; check if `device.ip` or `device.mac` is in `group.group_members` |
| Network/subnet | `source.matching_target === "NETWORK"` or subnet CIDR | parse CIDR, check if `device.ip` falls within — optional, may skip if not observed |

**Critical constraint:** The actual field names (`source`, `matching_target`, `ip_address`, `address_group_id`, `group_members`) are based on observed UniFi API patterns from community sources. These MUST be verified against a live console before the matching logic is finalized. The mock should be designed to cover all three primary patterns so the mapping function is exercised in tests before live verification.

---

## Build Order (Recommended)

The mapping layer must precede the UI because the API route depends on it, and the UI depends on the API route.

### Step 1: Types + Mapping Core (no network, fully testable)

1. Extend `types.ts` with `AddressGroup` schema and typed source/destination fields on `FirewallPolicySchema`
2. Create `mapping.ts` with `mapPoliciesToDevice()`
3. Write unit tests for all three match patterns (direct IP, direct MAC, group membership)

**Rationale:** This is the highest-risk area (UniFi API shape uncertainty). Getting the matching logic right in isolation, with tests, before any UI work prevents rework.

### Step 2: Data Fetching (new function + mock)

1. Add `getAddressGroups()` to `client.ts`
2. Add `getAddressGroups()` mock to `mock.ts` — mock groups MUST exercise the group membership path (so mock policies that reference group IDs, and mock groups containing mock device IPs/MACs)
3. Export from `index.ts`

**Rationale:** The mock is what enables development without a live console. Mock design is critical — the groups must mirror the real API structure so the mapping logic is exercised.

### Step 3: API Route

1. Create `src/app/api/firewall/device-rules/route.ts`
2. Test with mock mode against the mock clients' known MACs/IPs

**Rationale:** With mapping and fetching working, the route is straightforward composition. Test manually before UI work.

### Step 4: UI Integration

1. Modify `RuleToggle` with `extraMutateKeys` prop (smallest, most isolated change)
2. Modify `ClientTable` expanded row: add SWR fetch + render matched rules
3. Test toggle → Firewall page revalidation end-to-end

**Rationale:** UI is last because it depends on everything above. The `RuleToggle` change is deliberately minimal so existing Firewall page behavior is unchanged.

### Step 5: /statusz (independent, can run in parallel with Steps 1-4)

1. Extend `src/app/api/statusz/route.ts` with DB + UniFi checks
2. Create `src/app/statusz/page.tsx`

**Rationale:** Statusz has zero dependencies on the mapping layer. It can be built in parallel or after, at any point.

---

## What NOT to Do

### Do not duplicate the toggle logic

The `PUT /api/firewall` route and `updateFirewallPolicy()` are the single source of truth for toggle operations. Do not create a new "device row toggle" endpoint or Server Action. `RuleToggle` calls `PUT /api/firewall` directly; the device row reuses `RuleToggle` unchanged (except for `extraMutateKeys`).

### Do not add firewall data to the dashboard page server fetch

`DashboardPage` calls `getUnifiClients()` + `queryAllLastBusy()` at render time. Adding `getFirewallPolicies()` or `getAddressGroups()` here would load firewall data on every dashboard visit, for every user, even if they never expand a row. The lazy SWR approach is correct — only fetch when the row is expanded.

### Do not use `revalidatePath` for toggle revalidation

The app uses SWR with direct API routes, not Server Actions with `revalidatePath`. Mixing patterns would be confusing. The existing SWR key invalidation pattern (`mutate('/api/firewall')`) is the correct approach — extend it with `extraMutateKeys`, don't switch mechanisms.

### Do not hard-code match fields without testing against live hardware

The `source.matching_target` field names are inferred from community sources and the Art-of-WiFi API reference, not from this codebase's own live data. The `FirewallPolicySchema` passthrough currently throws away whatever shape these fields have. Design the mock to encode these field shapes explicitly, and treat the live hardware verification (UAT) as a required gate before shipping this feature.

---

## Phase-Specific Research Flags

| Phase topic | Likely needs deeper research | Reason |
|-------------|------------------------------|--------|
| Step 1: Mapping logic | YES — before coding | Need to verify real UniFi API field names for source/destination on live console. Check `firewall-policies` response shape against what passthrough preserves. |
| Step 2: Address groups endpoint | YES — before coding | Confirm `/firewall-address-groups` is the correct endpoint. Check v1 vs v2 path variation (same issue as the clients endpoint). |
| Step 4: ClientTable expanded row | UNLIKELY — standard SWR pattern | Pattern is identical to device history fetch. No new patterns needed. |
| Step 5: statusz page | UNLIKELY | No new patterns. DB check is a `SELECT 1`. UniFi check is a fetch with timeout. |

---

## Sources

- `src/lib/unifi/client.ts` — Direct inspection (HIGH confidence)
- `src/lib/unifi/types.ts` — Direct inspection (HIGH confidence)
- `src/lib/unifi/index.ts` — Direct inspection (HIGH confidence)
- `src/lib/unifi/mock.ts` — Direct inspection (HIGH confidence)
- `src/app/api/firewall/route.ts` — Direct inspection (HIGH confidence)
- `src/app/dashboard/page.tsx` — Direct inspection (HIGH confidence)
- `src/components/dashboard/client-table.tsx` — Direct inspection (HIGH confidence)
- `src/components/firewall/rule-toggle.tsx` — Direct inspection (HIGH confidence)
- `src/components/firewall/firewall-list.tsx` — Direct inspection (HIGH confidence)
- `.planning/milestones/v1.0-phases/03-firewall-control/03-RESEARCH.md` — Prior research on UniFi firewall API (HIGH confidence)
- `.planning/todos/pending/2026-07-18-firewall-shortcut-from-device-activity.md` — Feature spec (HIGH confidence)
- Art-of-WiFi UniFi-API-client API_REFERENCE.md — UniFi firewall-address-groups endpoint pattern (MEDIUM confidence — community, well-maintained)
