# Technology Stack

**Project:** UniFi Network Dashboard — v2.0 Local Edition
**Researched:** 2026-04-24
**Scope:** Stack additions and changes for direct local UniFi API client + self-hosted deployment. Base stack (Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, SWR, Recharts, jose, ky, Zod, Vitest+RTL) is validated and unchanged.

---

## What Changes in v2.0

Three areas require new or changed stack decisions:

1. **UniFi client rewrite** — replace Site Manager Proxy with direct local console API
2. **Self-signed TLS** — local UniFi console uses a self-signed HTTPS certificate
3. **Deployment** — remove Vercel, containerize with Docker standalone build

---

## 1. Direct Local UniFi API Client

### Authentication pattern

On UniFi OS consoles (Dream Machine Pro, UDM-SE, Cloud Gateway, etc.), the same `X-API-KEY` header used by the Site Manager Proxy also authenticates direct local requests. The key is generated locally at **UniFi Network → Settings → Control Plane → Integrations → Create New API Key** (requires Network Application v9.3.43+). No login/logout flow or session cookie is needed.

**Confidence:** MEDIUM — confirmed by multiple community sources and the Art-of-WiFi API client implementation; not explicitly stated in official Ubiquiti docs found during research.

### Endpoint structure

The existing codebase already hits the correct URL shape. The Site Manager Proxy calls go to:
```
https://api.ui.com/ea/console/{consoleId}/proxy/network/v2/api/site/default/...
```

The local equivalent strips the cloud proxy prefix and hits the console directly:
```
https://{LAN_IP}/proxy/network/v2/api/site/default/stat/sta
https://{LAN_IP}/proxy/network/v2/api/site/default/firewall-policies
https://{LAN_IP}/proxy/network/v2/api/site/default/site-feature-migration
```

The `/proxy/network/` prefix is required for all UniFi OS-based consoles (UDM, UDR, UCG, etc.) — it routes through UniFi OS to the Network Application. The path suffix after that prefix is identical to what the codebase already uses.

**Important:** The official `integration/v1` API (`/proxy/network/integration/v1/`) is a newer, more limited surface. It does not expose `rx_bytes-r` / `tx_bytes-r` real-time traffic fields or the firewall policies endpoints used by this app. Stick with the classic API path (`/proxy/network/v2/api/` or `/proxy/network/api/`). The `v2` path is what the current client already uses via the proxy; it should work identically when called directly.

**Confidence:** MEDIUM — the v2 path mirroring is strongly implied by how Site Manager proxy works; exact behavior of X-API-KEY on the classic v2 path locally should be validated empirically on the target hardware.

### No new npm packages needed for the client itself

`ky` remains the right HTTP client. The client.ts rewrite is purely a URL and auth-header change — no library additions.

---

## 2. Self-Signed TLS Certificate Handling

### The problem

The UniFi OS console serves HTTPS on port 443 with a self-signed certificate. Node.js (and therefore Next.js Server Components and Server Actions) will throw `ERR_TLS_CERT_ALTNAME_INVALID` or `SELF_SIGNED_CERT_IN_CHAIN` when making fetch/ky requests to the console without special handling.

`NODE_TLS_REJECT_UNAUTHORIZED=0` disables TLS verification globally for the entire process — this affects all outbound HTTPS calls, not just UniFi requests. Do not use it.

### Recommended approach: `undici` Agent dispatcher (no new package)

Node.js 18+ ships `undici` as its native fetch implementation. `ky` on Node.js uses native `fetch`, which accepts an `undici` dispatcher. A scoped `Agent` with `rejectUnauthorized: false` disables verification only for the UniFi console fetch calls:

```typescript
import { Agent } from 'undici'

const unifiAgent = new Agent({
  connect: { rejectUnauthorized: false },
})

// Pass as fetch init option — ky supports this via the `dispatcher` option
const client = ky.create({
  prefixUrl: `https://${process.env.UNIFI_HOST}/proxy/network`,
  headers: { 'X-API-KEY': process.env.UNIFI_API_KEY! },
  dispatcher: unifiAgent,   // ky passes unknown fetch options through
})
```

`undici` is not a new dependency — it is bundled with Node.js 18+. No `npm install` required.

**Alternative (also no new package):** Read the console's self-signed cert PEM, store it as an env var, and pass `ca: Buffer.from(cert)` to the Agent. This keeps TLS verification ON and is strictly more secure. However, it adds operational friction (cert must be exported from the console and re-exported when it rotates). For a LAN-only home network app, `rejectUnauthorized: false` scoped to the UniFi agent is the practical choice. The threat model is a family LAN, not a public internet endpoint.

**Confidence:** HIGH — undici Agent dispatcher behavior confirmed in Next.js GitHub discussions and Node.js undici issues.

---

## 3. Docker / Self-Hosted Deployment

### Next.js standalone output (add to `next.config.ts`)

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
}
```

This produces `.next/standalone/` — a self-contained directory with a `server.js` entrypoint and a trimmed `node_modules` containing only runtime deps. No `npm install` is needed in the production container. Image size drops significantly compared to copying the full project.

**Confidence:** HIGH — official Next.js docs, confirmed by multiple 2025 deployment guides.

### Dockerfile pattern (multi-stage, Node 22 Alpine)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

No new npm packages — just a `Dockerfile` and a one-line change to `next.config.ts`.

### Runtime environment variables

With standalone output, Next.js reads `process.env` at runtime (not baked in at build time for server-side vars). All sensitive env vars (`UNIFI_API_KEY`, `UNIFI_HOST`, `AUTH_SECRET`, etc.) are passed at container start:

```bash
docker run -p 3000:3000 \
  -e UNIFI_HOST=192.168.1.1 \
  -e UNIFI_API_KEY=your-key \
  -e AUTH_SECRET=your-secret \
  unifi-dashboard
```

Or via a `.env` file:
```bash
docker run --env-file .env.local -p 3000:3000 unifi-dashboard
```

### Reverse proxy (optional but recommended)

For LAN use, running the container directly on port 3000 is fine. If HTTPS is desired for the dashboard itself (separate from the UniFi console TLS), a Caddy or nginx reverse proxy with a LAN certificate is the addition. No Next.js changes needed — this is infrastructure.

**Confidence:** HIGH — official Next.js self-hosting docs + multiple 2025 Docker guides.

---

## 4. Vercel-Specific Removals

### What to audit and remove

| Feature | Current Status | Action |
|---------|---------------|--------|
| `vercel.json` | Does not exist | Nothing to do |
| Vercel Cron Jobs | Not used — app uses SWR polling, no server-side cron | Nothing to do |
| Vercel Edge Functions | Not used — no `export const runtime = 'edge'` found | Nothing to do |
| `NEXT_PUBLIC_` env vars | None found for API keys — correct pattern already followed | Nothing to do |
| Vercel-specific image CDN | `next/image` works self-hosted with `next start` and standalone output | Nothing to do |

**Finding:** The codebase has no Vercel-specific features to remove. The only Vercel dependency was the deployment target itself. `next/headers`, `cookies()`, Server Actions — all standard Next.js, all work in standalone Docker.

**Confidence:** HIGH — codebase review confirmed no `vercel.json`, no edge runtime exports, no Vercel SDK imports.

---

## Summary of Stack Changes for v2.0

### Add (config/infra only — no new npm packages)

| Change | Where | Why |
|--------|-------|-----|
| `output: 'standalone'` | `next.config.ts` | Enables Docker deployment without full node_modules |
| `Dockerfile` (multi-stage) | project root | Builds and runs the standalone output |
| `.dockerignore` | project root | Excludes node_modules, .next from build context |
| `UNIFI_HOST` env var | `.env.local`, docker run | Replaces `UNIFI_CONSOLE_ID` — points to LAN IP |
| `undici` Agent for TLS | `src/lib/unifi/client.ts` | Scoped self-signed cert bypass for UniFi HTTPS |

### Remove

| Change | Why |
|--------|-----|
| `UNIFI_CONSOLE_ID` env var | No longer needed — no cloud proxy, no console ID |
| Site Manager base URL (`api.ui.com`) | Replaced with direct LAN IP |
| Cloud proxy URL path prefix | Direct path to console |

### Keep Unchanged

All existing packages, versions, and patterns. The client.ts function signatures (`getUnifiClients`, `getFirewallPolicies`, etc.) stay identical — only the HTTP wiring inside changes. The mock layer, Zod schemas, types, and all consumers are unaffected.

---

## Version Pinning (current, from package.json)

| Package | Current Version | Notes |
|---------|----------------|-------|
| next | 16.2.3 | Already upgraded beyond 15.x |
| ky | 2.0.1 | Supports `dispatcher` passthrough to undici |
| undici | bundled with Node 22 | No npm install needed |
| Node.js (Docker) | 22-alpine | LTS, supported through 2027 |

---

## Open Questions / Validation Needed

1. **X-API-KEY on v2 path locally:** Confirm that `X-API-KEY` header authenticates successfully against `https://{LAN_IP}/proxy/network/v2/api/site/default/...` on the target hardware. The Site Manager proxy accepted it; the local console should as well, but this has not been validated against real hardware.

2. **`rx_bytes-r` / `tx_bytes-r` via v2 path locally:** The current Zod schema and transformClient function depend on these fields from `stat/sta`. Verify the response shape is identical when calling the local endpoint vs. the proxied version.

3. **Firewall policies endpoint locally:** The app uses `/firewall-policies` (v2 path). Verify this path exists on the local console or falls back to the classic `/rest/firewallrule` path. If it doesn't exist locally, the schema and client will need to target the classic path instead.

4. **Port:** UniFi OS consoles use port 443 (HTTPS). Confirm whether any target hardware uses a non-standard port.

---

## Sources

- **Next.js Self-Hosting Guide** — [nextjs.org/docs/app/guides/self-hosting](https://nextjs.org/docs/app/guides/self-hosting) — HIGH confidence (official docs, updated 2026-04-23)
- **Next.js Deploying Guide** — [nextjs.org/docs/app/getting-started/deploying](https://nextjs.org/docs/app/getting-started/deploying) — HIGH confidence (official)
- **undici Agent with rejectUnauthorized** — [github.com/vercel/next.js/discussions/74187](https://github.com/vercel/next.js/discussions/74187) — HIGH confidence (Next.js official repo discussion)
- **UniFi API Key Authentication** — [help.ui.com/hc/en-us/articles/30076656117655](https://help.ui.com/hc/en-us/articles/30076656117655) — MEDIUM confidence (official Ubiquiti Help Center, behind 403 during research)
- **UniFi API Authentication Methods** — [artofwifi.net/blog/unifi-api-authentication-local-admin-vs-api-key-vs-site-manager](https://artofwifi.net/blog/unifi-api-authentication-local-admin-vs-api-key-vs-site-manager) — MEDIUM confidence (community, well-maintained)
- **UniFi Classic API Reference** — [ubntwiki.com/products/software/unifi-controller/api](https://ubntwiki.com/products/software/unifi-controller/api) — MEDIUM confidence (community reverse-engineering, widely used)
- **UniFi Developer Best Practices** — [github.com/uchkunr/awesome-unifi](https://github.com/uchkunr/awesome-unifi) — MEDIUM confidence (community guide with integration/v1 and classic API comparison)
- **Docker Next.js Standalone 2025** — [serversinc.io/blog/how-to-deploy-next-js-to-a-docker-container-complete-2025-production-guide](https://serversinc.io/blog/how-to-deploy-next-js-to-a-docker-container-complete-2025-production-guide) — MEDIUM confidence (community)

---
*Stack research for: UniFi Network Dashboard v2.0 Local Edition*
*Researched: 2026-04-24*
*Supersedes: v1.0 stack research (2026-04-14) for the areas covered above*
