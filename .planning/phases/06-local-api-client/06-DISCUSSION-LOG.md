# Phase 6: Local API Client - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 06-local-api-client
**Mode:** --auto (all areas auto-selected, recommended options chosen)
**Areas discussed:** HTTP Client & TLS Strategy, undici Agent Scoping, Environment Variables, Local API Endpoint Paths

---

## HTTP Client & TLS Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `ky` + undici dispatcher hook | Wrap undici Agent via ky's `fetch` override option | |
| Use `undici` directly | Switch from ky to `undici.fetch` + `Agent` with `dispatcher` option | ✓ |
| Native Node.js fetch + global Agent | Set global undici dispatcher at process level | |

**Auto-selected:** Use `undici` directly
**Rationale:** ky doesn't natively expose a dispatcher option. Using `undici.fetch` directly with a scoped `Agent` is the cleanest path to per-client TLS configuration without affecting other outbound HTTPS requests.

---

## undici Agent Scoping

| Option | Description | Selected |
|--------|-------------|----------|
| Module-level singleton | Create Agent once at module init, reuse for all requests | ✓ |
| Per-request Agent | Create new Agent on every function call | |

**Auto-selected:** Module-level singleton
**Rationale:** Consistent with existing pattern (UNIFI_MOCK evaluated once at module init in index.ts). Avoids per-request object allocation. Correct for a long-running Node.js server process.

---

## Environment Variables

| Option | Description | Selected |
|--------|-------------|----------|
| Clean break | Remove UNIFI_CONSOLE_ID, add UNIFI_HOST | ✓ |
| Keep UNIFI_CONSOLE_ID for backward compat | Add UNIFI_HOST alongside UNIFI_CONSOLE_ID | |

**Auto-selected:** Clean break
**Rationale:** UNIFI_CONSOLE_ID was a Site Manager concept (console UUID used in the proxy URL). It has no meaning in direct LAN access. Keeping it would be misleading. v2.0 is a full replacement, not a backward-compatible addition.

---

## Local API Endpoint Paths

| Option | Description | Selected |
|--------|-------------|----------|
| Strip Site Manager prefix only | `/proxy/network/v2/api/site/default/...` (keep v2 paths) | ✓ |
| Use legacy controller paths | `/api/s/default/...` (older UniFi controller format) | |
| Configurable path prefix | Env var for base path | |

**Auto-selected:** Strip Site Manager prefix only
**Rationale:** The Site Manager proxy was prepending `/ea/console/{consoleId}/` to the actual UniFi OS console paths. Removing that prefix gives the correct direct path. The v2 API endpoints (`stat/sta`, `firewall-policies`, `site-feature-migration`) are the same on the local console.

---

## Claude's Discretion

- Import style for undici (named vs namespace)
- Whether to extract Agent init into a helper vs inline

## Deferred Ideas

- Retry logic on transient LAN errors (v2.1+)
- UNIFI_SITE env var for non-default sites
- Connection health check endpoint (Phase 7 Docker healthcheck concern)
