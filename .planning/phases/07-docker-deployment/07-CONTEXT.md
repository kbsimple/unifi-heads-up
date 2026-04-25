# Phase 7: Docker Deployment - Context

**Gathered:** 2026-04-24 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Package the Next.js app for self-hosted LAN deployment using Docker. Deliver: `output: 'standalone'` build config, a multi-stage Dockerfile, a `docker-compose.yml` with always-on restart policy and runtime-only secret injection, a `.env.prod.example` template, and a README section a household member with no prior context can follow to reach the running app on the LAN.

New features (richer data, new UI) are out of scope — this is a packaging and deployment phase.

</domain>

<decisions>
## Implementation Decisions

### Next.js Standalone Build
- **D-01:** Add `output: 'standalone'` to `next.config.ts`. This is required by DEPLOY-01 and is the standard Next.js pattern for Docker deployments — produces a `.next/standalone` directory with minimal Node runtime and all dependencies inlined.

### Dockerfile
- **D-02:** Multi-stage Dockerfile with `builder` and `runner` stages. Base image: `node:22-alpine` for both stages (required by DEPLOY-02).
- **D-03:** Builder stage: installs dependencies, runs `next build`. Runner stage: copies only `.next/standalone`, `.next/static` (into `.next/static`), and `public` (into `public`) from the builder — minimal final image, no dev dependencies, no source code.
- **D-04:** `WORKDIR /app` in both stages. Runner stage sets `ENV NODE_ENV=production` and runs `node server.js` (the standalone entry point).
- **D-05:** No `ENV` directives for `UNIFI_HOST`, `UNIFI_API_KEY`, or `SESSION_SECRET` in the Dockerfile — these are injected at runtime only (required by DEPLOY-04).
- **D-06:** Add `.dockerignore` covering: `node_modules`, `.next`, `.env*`, `.git`, `README.md`, `.planning`.

### Docker Compose
- **D-07:** `docker-compose.yml` with a single `app` service: image built from local Dockerfile, port `3000:3000`, `restart: unless-stopped` (required by DEPLOY-03), `env_file: .env.prod` (required by DEPLOY-04).
- **D-08:** Add a `healthcheck` in docker-compose.yml using `wget -qO- http://localhost:3000/api/health || exit 1`, interval 30s, timeout 5s, retries 3. This depends on D-09.

### Health Check Endpoint
- **D-09:** Add `src/app/api/health/route.ts` returning `{ ok: true }` with HTTP 200. No auth required — LAN-only endpoint, internal use. Phase 6 deferred this specifically for Docker healthcheck use in Phase 7.

### Secret Management
- **D-10:** `.env.prod` file: consumed by docker-compose at runtime, never baked into the image, added to `.gitignore`.
- **D-11:** `.env.prod.example` committed to the repo as a template with placeholder values — documents required vars (`UNIFI_HOST`, `UNIFI_API_KEY`, `SESSION_SECRET`, `PORT=3000`) so setup is self-guided. Note: the session secret env var is `SESSION_SECRET` (confirmed in `src/lib/session.ts:12`), not `AUTH_SECRET`.

### Documentation
- **D-12:** Update `README.md` with a "Self-Hosted / Docker" section (required by DEPLOY-05). Content: prerequisites (Docker + Docker Compose), step-by-step from `git clone` to browser-accessible app on the LAN, required env vars with example values, how to update (pull + rebuild), how to stop.
- **D-13:** Documentation language: plain English — no jargon beyond what Docker's own docs use. A household member with no prior context is the target reader (from DEPLOY-05 success criterion).

### Port
- **D-14:** Container runs on port 3000 (Next.js default). Exposed as `3000:3000` in docker-compose.yml. Not configurable in v2.0 — single household use case.

### Claude's Discretion
- Whether to use `CMD` or `ENTRYPOINT` for the runner stage command: Claude's choice — `CMD ["node", "server.js"]` is the conventional pattern.
- Exact Dockerfile `COPY --from=builder` path details: Claude's choice, follow Next.js standalone documentation pattern.
- Whether to include `EXPOSE 3000` in the Dockerfile: Claude's choice — cosmetic, but conventional.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — DEPLOY-01 through DEPLOY-05 define acceptance criteria for this phase
- `.planning/ROADMAP.md` — Phase 7 success criteria (5 items) and phase dependencies

### Prior Phase Context
- `.planning/phases/06-local-api-client/06-CONTEXT.md` — D-04 (env vars: `UNIFI_HOST`, `UNIFI_API_KEY`), D-05 (`UNIFI_CONSOLE_ID` removed), deferred item: "Connection health check endpoint — useful for Docker healthcheck in Phase 7"

### Existing Code to Understand
- `next.config.ts` — Add `output: 'standalone'` here (currently empty config)
- `package.json` — Node version, build scripts, current Next.js version (16.2.3)
- `src/app/` — Where to add `api/health/route.ts`
- `.env.local.example` — Reference for existing env var documentation pattern

### No external spec files — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/api/` directory pattern: existing API routes (e.g., auth routes) show the Next.js route handler pattern — `api/health/route.ts` follows the same convention.
- `.env.local.example`: existing env var template committed to repo — `.env.prod.example` follows the same pattern.
- `README.md`: existing documentation file — Docker section appended here, not a new file.

### Established Patterns
- Env var validation at function top (Phase 6 pattern) — health route needs no env vars, just returns static `{ ok: true }`.
- `server-only` guard used in lib code — health route is a public endpoint, no `server-only` import needed.
- No existing Docker artifacts — Dockerfile, docker-compose.yml, .dockerignore are all net-new files.

### Integration Points
- `next.config.ts` → `output: 'standalone'` addition is the only change to existing config files.
- `src/app/api/health/route.ts` → new route, no impact on existing routes.
- `.gitignore` → add `.env.prod` entry.
- `README.md` → append Docker section.

</code_context>

<specifics>
## Specific Ideas

- Phase 6 deferred: "Connection health check endpoint — useful for Docker healthcheck in Phase 7" → this is D-09, folded into scope.
- The `.next/standalone/server.js` entry point is auto-generated by Next.js when `output: 'standalone'` is set — runner stage runs `node server.js` from `WORKDIR /app`.
- Static assets must be manually copied from build stage: `.next/static` → `/app/.next/static` and `public` → `/app/public` — Next.js standalone does not include these automatically.

</specifics>

<deferred>
## Deferred Ideas

- Watchtower or auto-update mechanism — out of scope for v2.0, manual `docker-compose pull && docker-compose up -d --build` is sufficient.
- Nginx reverse proxy for HTTPS termination — LAN-only use case; plain HTTP on port 3000 is acceptable for household use.
- Multi-arch image build (ARM for Dream Machine Pro or NAS) — not validated as needed; defer to v2.1+ if needed.
- Configurable port via env var — single deployment, port 3000 is fine for v2.0.

</deferred>

---

*Phase: 07-docker-deployment*
*Context gathered: 2026-04-24*
