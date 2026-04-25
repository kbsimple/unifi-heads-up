# Phase 7: Docker Deployment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-04-24
**Phase:** 07-docker-deployment
**Mode:** discuss (--auto)
**Areas discussed:** Next.js Standalone Build, Dockerfile Structure, Docker Compose Config, Secret Management, Health Check Endpoint, Documentation Scope

---

## Next.js Standalone Build

| Option | Description | Selected |
|--------|-------------|----------|
| Add `output: 'standalone'` | Required by DEPLOY-01. Standard Next.js Docker pattern — produces `.next/standalone` with inlined dependencies. | ✓ |
| Skip / keep current config | Would require custom server setup or full `node_modules` in image — not standard. | |

**Auto-selected:** Add `output: 'standalone'` (recommended — required by DEPLOY-01)
**Notes:** `next.config.ts` is currently an empty config object. Single-line addition.

---

## Dockerfile Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-stage (builder + runner), Node 22 Alpine | Required by DEPLOY-02. Builder installs deps + builds; runner copies only standalone output. Minimal final image. | ✓ |
| Single-stage | Includes all dev dependencies and source code in final image — not acceptable for production. | |

**Auto-selected:** Multi-stage, Node 22 Alpine (recommended — required by DEPLOY-02, minimal image)
**Notes:** Runner stage copies `.next/standalone`, `.next/static`, and `public`. Runs `node server.js`.

---

## Docker Compose Config

| Option | Description | Selected |
|--------|-------------|----------|
| `restart: unless-stopped` + `env_file: .env.prod` + port 3000:3000 | Required by DEPLOY-03 and DEPLOY-04. Household always-on use case. | ✓ |
| `restart: always` | Restarts even on manual stop — less predictable for household management. | |

**Auto-selected:** `restart: unless-stopped`, port 3000:3000, `env_file: .env.prod` (recommended — required by DEPLOY-03/04)
**Notes:** Single `app` service. Healthcheck included (depends on /api/health endpoint).

---

## Secret Management

| Option | Description | Selected |
|--------|-------------|----------|
| `env_file: .env.prod` at runtime, `.env.prod.example` committed | Required by DEPLOY-04. Secrets never in image. Template guides setup. | ✓ |
| Bake secrets into image | Violates DEPLOY-04 — secrets visible in image layers. | |
| Pass via `docker run -e` flags | Manual, error-prone — not household-friendly. | |

**Auto-selected:** env_file pattern (recommended — required by DEPLOY-04)
**Notes:** `.env.prod` added to `.gitignore`. `.env.prod.example` with placeholder values committed.

---

## Health Check Endpoint

| Option | Description | Selected |
|--------|-------------|----------|
| Add `/api/health` route returning `{ ok: true }` | Phase 6 deferred this explicitly for Phase 7. Enables Docker healthcheck. Simple, no auth needed. | ✓ |
| Skip — use TCP port check | Less reliable, doesn't verify app is actually responding. | |

**Auto-selected:** Add /api/health route (recommended — Phase 6 deferred this for exactly this use case)
**Notes:** New file: `src/app/api/health/route.ts`. Public endpoint, LAN-internal use.

---

## Documentation Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Append to README.md | Keeps docs consolidated. Household members only need one place to look. | ✓ |
| New SETUP.md | Separate file — adds navigation complexity for non-technical users. | |

**Auto-selected:** Append to README.md (recommended — single doc is simpler for household users, DEPLOY-05 requires plain-English instructions)
**Notes:** Content: prerequisites, step-by-step setup, env vars with examples, update procedure, stop procedure.

---

## Claude's Discretion

- `CMD` vs `ENTRYPOINT` in Dockerfile runner: `CMD ["node", "server.js"]` is conventional
- Whether to include `EXPOSE 3000`: cosmetic but conventional
- Exact `COPY --from=builder` path structure

## Deferred Ideas

- Nginx reverse proxy for HTTPS
- Watchtower / auto-update
- Multi-arch ARM build
- Configurable port via env var
