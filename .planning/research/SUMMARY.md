# Project Research Summary

**Project:** UniFi Network Dashboard — v2.0 Local Edition
**Domain:** Home network monitoring dashboard with direct local API integration
**Researched:** 2026-04-24
**Confidence:** MEDIUM (local API behavior on target hardware not yet empirically validated)

---

## Executive Summary

v2.0 replaces the broken Site Manager Proxy (`api.ui.com`) with a direct local UniFi console API client. The core codebase (Next.js 16, Tailwind 4, shadcn/ui, SWR, Zod, ky) is unchanged — the migration is a targeted rewrite of `src/lib/unifi/client.ts` plus three infrastructure additions: a Dockerfile, an `output: 'standalone'` config line, and a replacement env var (`UNIFI_HOST` in place of `UNIFI_CONSOLE_ID`). No new npm packages are required.

The local UniFi API uses the same `X-API-KEY` header and the same URL path suffix already in the codebase. The Site Manager Proxy was a cloud pass-through to the same paths; removing the cloud prefix and pointing directly at the console LAN IP is the entirety of the client change. The one new technical challenge is the console's self-signed TLS certificate — fixed with a scoped `undici` Agent (`rejectUnauthorized: false`) applied only to UniFi requests. `undici` ships with Node.js 18+, so no npm install is needed.

The primary risk is empirical: X-API-KEY auth on the classic `/proxy/network/v2/api/` path, the shape of `rx_bytes-r`/`tx_bytes-r` fields from the local endpoint, and availability of the `/firewall-policies` v2 path locally are all MEDIUM-confidence findings based on community sources. These need validation on real hardware.

---

## Key Findings

### Stack Additions (no new npm packages)

| Change | Where | Why |
|--------|-------|-----|
| `output: 'standalone'` | `next.config.ts` | Enables Docker deployment without full node_modules |
| `Dockerfile` (multi-stage, Node 22 Alpine) | project root | Builds and runs standalone output |
| `.dockerignore` | project root | Excludes node_modules, .next from build context |
| `UNIFI_HOST` env var | `.env.local`, docker run | Replaces `UNIFI_CONSOLE_ID`; points to console LAN IP |
| Scoped `undici` Agent | `src/lib/unifi/client.ts` | Self-signed cert bypass for UniFi HTTPS only |

### Removals

| Change | Why |
|--------|-----|
| `UNIFI_CONSOLE_ID` env var | No longer needed — no cloud proxy, no console ID |
| `api.ui.com` base URL and cloud proxy prefix | Replaced by `https://{UNIFI_HOST}/proxy/network` |

### Local API: URL Pattern

```
Old (Site Manager Proxy):
  https://api.ui.com/ea/console/{consoleId}/proxy/network/v2/api/site/default/stat/sta

New (direct local):
  https://{UNIFI_HOST}/proxy/network/v2/api/site/default/stat/sta
```

All endpoint suffixes after `/proxy/network` are **unchanged**. Auth header is the same `X-API-KEY`.

### Critical Pitfalls

1. **Zone-Based Firewall (ZBF) — legacy endpoint returns empty on Network 9.0+.**
   The codebase already uses `/proxy/network/v2/api/site/default/firewall-policies` (the correct ZBF-era path). Verify this path works locally. Detection: `GET /proxy/network/v2/api/site/default/site-feature-migration`.

2. **CSRF token on write operations — NOT needed for API key auth.**
   CSRF only applies to session-cookie-based local admin auth. The app uses `X-API-KEY` (stateless). Do not add CSRF handling.

3. **Traffic rate fields: `-r` suffix is bytes/second, not cumulative.**
   `rx_bytes-r` / `tx_bytes-r` are live rate gauges. The existing Zod schema uses these — correct. Verify local endpoint returns same field shape.

4. **Do NOT use `NODE_TLS_REJECT_UNAUTHORIZED=0` globally.**
   The scoped `undici` Agent is the correct approach — it disables TLS verification only for UniFi requests, not all outbound HTTPS.

---

## Recommended Build Order

1. **Local Client Rewrite** — Replace base URL, remove `consoleId`, add undici TLS Agent; validate on real hardware empirically
2. **Docker Packaging** — `output: 'standalone'` + Dockerfile + documented env vars; standard pattern
3. **End-to-End Validation** — Smoke test all features against live console in Docker; confirm and close milestone

---

## Open Questions (need real-hardware validation)

| Question | Fallback if fails |
|----------|-------------------|
| X-API-KEY accepted on local `/proxy/network/v2/api/` path? | Session-cookie auth + CSRF handling |
| `rx_bytes-r` / `tx_bytes-r` present in local `stat/sta` response? | Schema + traffic logic needs adjustment |
| `/firewall-policies` endpoint available locally? | Classic `/rest/firewallrule` fallback |
| Console port (expected 443)? | `UNIFI_HOST` becomes `{IP}:{port}` |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack changes | HIGH | Official Next.js patterns; Docker is standard |
| Local API URL structure | MEDIUM | Path mirroring implied; not explicitly documented by Ubiquiti |
| X-API-KEY on local v2 path | MEDIUM | Community-confirmed; official docs inaccessible during research |
| ZBF / firewall endpoint | MEDIUM | Codebase already uses correct v2 path; local availability unconfirmed |
| Traffic field shape locally | MEDIUM | Expected to match proxy response; not validated on real hardware |
| Feature scope | HIGH | v2.0 is a connectivity migration; feature scope locked from v1.x |
| Architecture | HIGH | Existing layered pattern unchanged; only client.ts changes |

---

## Sources

- **Next.js Self-Hosting Guide** — nextjs.org/docs/app/guides/self-hosting — HIGH
- **Next.js Deploying Guide** — nextjs.org/docs/app/getting-started/deploying — HIGH
- **undici Agent / rejectUnauthorized** — github.com/vercel/next.js/discussions/74187 — HIGH
- **Art-of-WiFi API auth comparison** — artofwifi.net/blog/unifi-api-authentication-local-admin-vs-api-key-vs-site-manager — MEDIUM
- **ubntwiki Classic API Reference** — ubntwiki.com/products/software/unifi-controller/api — MEDIUM
- **Ubiquiti Help Center API key setup** — help.ui.com/hc/en-us/articles/30076656117655 — MEDIUM (403 during research)

---
*Researched: 2026-04-24 | Supersedes: v1.0 summary (2026-04-14) | Ready for roadmap: yes*
