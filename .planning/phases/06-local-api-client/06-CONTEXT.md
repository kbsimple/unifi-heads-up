# Phase 6: Local API Client - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the Site Manager Proxy client (`src/lib/unifi/client.ts`) with a direct LAN client that authenticates to the UniFi console using `X-API-KEY` over HTTPS. Handle the console's self-signed TLS certificate with a scoped `undici` Agent. Mock layer (`UNIFI_MOCK=true`) remains functional. All existing features (traffic dashboard, firewall toggles, device groups, 24h history) deliver real data from the local console.

New capabilities (richer data, new UI, etc.) are out of scope — this is a connectivity migration.

</domain>

<decisions>
## Implementation Decisions

### HTTP Client & TLS Strategy
- **D-01:** Use `undici` directly (`undici.fetch` + `undici.Agent`) instead of `ky`. ky does not natively support undici dispatchers; switching to `undici.fetch` allows passing a scoped `Agent` with `rejectUnauthorized: false` via the `dispatcher` option without touching global TLS settings.
- **D-02:** The undici `Agent` is the ONLY place `rejectUnauthorized: false` appears — no `NODE_TLS_REJECT_UNAUTHORIZED` env var, no global override.

### undici Agent Scoping
- **D-03:** Create a single module-level `undici.Agent` singleton at module init time — not per request. All calls within `client.ts` reuse this agent. This avoids per-request object creation and is consistent with how the mock facade already evaluates `UNIFI_MOCK` once at module init.

### Environment Variables
- **D-04:** Remove `UNIFI_CONSOLE_ID` — it was a Site Manager concept (console UUID), irrelevant to direct LAN access.
- **D-05:** Add `UNIFI_HOST` — the console's LAN hostname or IP (e.g., `192.168.1.1` or `unifi.local`). Port may be included if non-standard (e.g., `192.168.1.1:8443`). Default port: 443.
- **D-06:** Keep `UNIFI_API_KEY` unchanged — same header (`X-API-KEY`), same concept, just a different target host.
- **D-07:** Update `.env.local.example` (or equivalent) to reflect the new vars. Remove `UNIFI_CONSOLE_ID`, add `UNIFI_HOST`.

### Local API Endpoint Paths
- **D-08:** Strip the Site Manager proxy prefix from all endpoint paths. Current pattern: `/ea/console/{consoleId}/proxy/network/v2/api/site/default/...` → New pattern: `/proxy/network/v2/api/site/default/...`. The v2 API paths themselves (`stat/sta`, `firewall-policies`, `site-feature-migration`) are unchanged.
- **D-09:** Base URL constructed as `https://${process.env.UNIFI_HOST}/proxy/network/v2/api/site/default`.

### Mock Layer Preservation
- **D-10:** `src/lib/unifi/index.ts` facade is unchanged — it already routes to real vs mock based on `UNIFI_MOCK`. No changes needed to `mock.ts` or `index.ts`.
- **D-11:** `UNIFI_HOST` is only referenced in `client.ts` — mock path never reaches it, so no mock-path validation changes needed.

### Error Handling
- **D-12:** Validate `UNIFI_HOST` and `UNIFI_API_KEY` at the top of each exported function (same pattern as current `UNIFI_CONSOLE_ID` + `UNIFI_API_KEY` checks). Throw descriptive errors for missing env vars.
- **D-13:** Connection errors to the LAN console (ECONNREFUSED, ETIMEDOUT, TLS errors) should propagate as-is — do not swallow. Caller context (Server Actions, Server Components) already has error boundaries.

### Claude's Discretion
- Import style for `undici` (named imports vs namespace): Claude's choice — use whatever is cleaner.
- Whether to extract the undici Agent init into a small helper vs inline in `client.ts`: Claude's choice — keep it simple.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — LOCAL-01 through LOCAL-05 define acceptance criteria for this phase
- `.planning/ROADMAP.md` — Phase 6 success criteria (5 items) and phase dependencies

### Existing Code (must read before rewriting)
- `src/lib/unifi/client.ts` — The file being rewritten; understand all exported functions and their current ky usage
- `src/lib/unifi/index.ts` — Facade that routes real/mock; must remain unchanged
- `src/lib/unifi/mock.ts` — Mock implementation; interface must stay compatible
- `src/lib/unifi/types.ts` — Zod schemas and TypeScript types; reused unchanged
- `src/lib/unifi/traffic.ts` — Traffic calculation helper; reused unchanged

### Research Findings
- `.planning/research/PITFALLS.md` — Pitfall 3 (auth throttling), Pitfall 2 (ZBF endpoints); both relevant to local API
- `.planning/research/STACK.md` — undici and ky context

### No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/unifi/types.ts`: All Zod schemas (`UnifiClientSchema`, `FirewallPolicySchema`, `FirewallPolicyResponseSchema`) and TypeScript types are reused without change — same API response shapes.
- `src/lib/unifi/traffic.ts`: `calculateTrafficStatus()` helper reused without change.
- `src/lib/unifi/index.ts`: Facade unchanged — continues to route via `UNIFI_MOCK`.
- `src/lib/unifi/mock.ts`: Mock unchanged — interface compatibility maintained.

### Established Patterns
- Env var validation at function top (throw on missing) — keep this pattern in new client.
- `transformClient()` helper for API → `NetworkClient` mapping — keep this function intact.
- `server-only` import guard — keep at top of `client.ts`.
- Zod `.parse()` for response validation — keep all validation calls.
- 10s timeout — keep same value for local LAN (fast network, but timeouts still needed).

### Integration Points
- Only `src/lib/unifi/index.ts` imports from `client.ts` — no other callers to update.
- The exported function signatures (`getUnifiClients`, `getFirewallPolicies`, `updateFirewallPolicy`, `isZoneBasedFirewallEnabled`) must stay identical — they're the interface the facade depends on.
- `undici` is available in Node.js 18+ (built-in) and as a package — confirm which Next.js 15 uses. If not built-in, add `undici` as a dependency.

</code_context>

<specifics>
## Specific Ideas

- The Site Manager proxy prefix to strip is exactly `/ea/console/${consoleId}/` — everything after that maps 1:1 to the local API paths.
- If `UNIFI_HOST` includes a port (e.g., `192.168.1.1:8443`), the base URL becomes `https://192.168.1.1:8443/proxy/...`.
- The undici Agent needs `connect: { rejectUnauthorized: false }` to accept the self-signed cert.

</specifics>

<deferred>
## Deferred Ideas

- Retry logic on transient connection errors — could be valuable for LAN reliability, but adds complexity; defer to v2.1+.
- `UNIFI_SITE` env var to support non-default sites — only one site in use; defer.
- Connection health check endpoint — useful for Docker healthcheck in Phase 7; not needed in Phase 6 itself.

</deferred>

---

*Phase: 06-local-api-client*
*Context gathered: 2026-04-24*
