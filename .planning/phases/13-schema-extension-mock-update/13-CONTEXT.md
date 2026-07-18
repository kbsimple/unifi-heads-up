# Phase 13: Schema Extension & Mock Update - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Extend the `FirewallPolicySchema` Zod schema with typed `source` and `destination` fields (including `client_macs?: string[]`) and update mock firewall policies to include realistic ZBF and legacy MAC/IP targeting fields. This gives the mapping logic in Phase 15 realistic test fixtures to validate against — without this, any mapping unit test would pass vacuously.

Scope: types.ts schema changes + mock.ts policy updates. No new API routes, no UI changes, no behavior changes for existing callers.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

Key constraints from research:
- Add `FirewallPolicyEndpointSchema` sub-schema with `client_macs?: string[]`, `zone_id?: string`, `matching_target?: string`
- Add `source?: FirewallPolicyEndpointSchema` and `destination?: FirewallPolicyEndpointSchema` to `FirewallPolicySchema`
- Keep `.passthrough()` on the outer schema — other unknown fields still flow through
- Mock must include ≥1 ZBF policy (source.client_macs referencing a mock device MAC) and ≥1 legacy policy (srcMac field)
- Existing unit tests and E2E tests must pass unchanged — schema extension is strictly additive

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/unifi/types.ts` — `FirewallPolicySchema` with `.passthrough()`, `UnifiScheduleSchema`, `NetworkClient`
- `src/lib/unifi/mock.ts` — `mockPolicies` array with 3 policies (Block Gaming Consoles, Pause Kids Devices, Guest Network Restrict)
- Mock device MACs: aa:bb:cc:dd:ee:01 through :06; IPs: 192.168.1.101–106

### Established Patterns
- Zod schema extension via `.extend()` or adding optional fields
- Mock data is module-level const arrays; policies use `FirewallPolicy` type
- `FirewallPolicySchema.passthrough()` already preserves unknown API fields

### Integration Points
- `types.ts` changes flow through to all consumers (client.ts, mock.ts, API routes, tests)
- Mock policy additions need to stay valid `FirewallPolicy` objects (pass schema validation)

</code_context>

<specifics>
## Specific Ideas

From research:
- ZBF policy example: `{ _id: 'policy-zbf-1', name: 'Block Nintendo Switch', enabled: true, source: { client_macs: ['aa:bb:cc:dd:ee:06'] } }` — targets Nintendo Switch by MAC
- Legacy policy example: `{ _id: 'policy-legacy-1', name: 'Block MacBook', enabled: false, srcMac: 'aa:bb:cc:dd:ee:01' }` — targets MacBook by MAC
- Existing 3 mock policies have no source/destination fields — add ZBF/legacy examples alongside them

</specifics>

<deferred>
## Deferred Ideas

- IP group resolution (MAPP-F01) — deferred to future milestone
- Full `matching_target` enum typing — LOW confidence field names, left as `string?`

</deferred>
