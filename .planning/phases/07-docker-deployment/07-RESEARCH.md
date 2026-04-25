# Phase 7: Docker Deployment - Research

**Researched:** 2026-04-24
**Domain:** Next.js standalone Docker packaging, multi-stage builds, docker-compose, secret injection
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Add `output: 'standalone'` to `next.config.ts`.
- **D-02:** Multi-stage Dockerfile with `builder` and `runner` stages. Base image: `node:22-alpine` for both stages.
- **D-03:** Builder stage: installs dependencies, runs `next build`. Runner stage: copies only `.next/standalone`, `.next/static` (into `.next/static`), and `public` (into `public`) from the builder.
- **D-04:** `WORKDIR /app` in both stages. Runner stage sets `ENV NODE_ENV=production` and runs `node server.js`.
- **D-05:** No `ENV` directives for `UNIFI_HOST`, `UNIFI_API_KEY`, or `AUTH_SECRET` in the Dockerfile.
- **D-06:** Add `.dockerignore` covering: `node_modules`, `.next`, `.env*`, `.git`, `README.md`, `.planning`.
- **D-07:** `docker-compose.yml` with a single `app` service: image built from local Dockerfile, port `3000:3000`, `restart: unless-stopped`, `env_file: .env.prod`.
- **D-08:** Add a `healthcheck` in docker-compose.yml using `wget -qO- http://localhost:3000/api/health || exit 1`, interval 30s, timeout 5s, retries 3.
- **D-09:** Add `src/app/api/health/route.ts` returning `{ ok: true }` with HTTP 200. No auth required.
- **D-10:** `.env.prod` file: consumed by docker-compose at runtime, never baked into the image, added to `.gitignore`.
- **D-11:** `.env.prod.example` committed to the repo as a template with placeholder values documenting `UNIFI_HOST`, `UNIFI_API_KEY`, `AUTH_SECRET`, `PORT=3000`.
- **D-12:** Update `README.md` with a "Self-Hosted / Docker" section.
- **D-13:** Documentation language: plain English — target reader is a household member with no prior context.
- **D-14:** Container runs on port 3000, exposed as `3000:3000`.

### Claude's Discretion
- Whether to use `CMD` or `ENTRYPOINT` for the runner stage command.
- Exact Dockerfile `COPY --from=builder` path details.
- Whether to include `EXPOSE 3000` in the Dockerfile.

### Deferred Ideas (OUT OF SCOPE)
- Watchtower or auto-update mechanism.
- Nginx reverse proxy for HTTPS termination.
- Multi-arch image build (ARM for Dream Machine Pro or NAS).
- Configurable port via env var.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | Next.js app builds with `output: 'standalone'` in `next.config.ts` | Confirmed: add `output: 'standalone'` to the `NextConfig` object in `next.config.ts`. Produces `.next/standalone/server.js`. |
| DEPLOY-02 | Multi-stage `Dockerfile` (Node 22 Alpine, builder + runner stages) produces a runnable image | Confirmed: official Next.js Docker example uses multi-stage with node alpine. Exact COPY commands and `HOSTNAME=0.0.0.0` requirement documented below. |
| DEPLOY-03 | `docker-compose.yml` with `restart: unless-stopped` and `env_file` support | Confirmed: standard docker-compose.yml pattern with healthcheck via wget (Alpine-native). |
| DEPLOY-04 | All sensitive config passed at container runtime — not baked into image | Confirmed: no `ENV` directives for secrets in Dockerfile; `env_file: .env.prod` in docker-compose.yml. |
| DEPLOY-05 | Setup documented: build image, start with docker-compose, required env vars, reach app on LAN | Confirmed: README.md "Self-Hosted / Docker" section content scope defined. |
</phase_requirements>

---

## Summary

Phase 7 packages the existing Next.js 16.2.3 application for self-hosted LAN deployment using Docker standalone mode. All decisions are locked in CONTEXT.md — this research confirms the technical correctness of each decision and surfaces the two non-obvious implementation details that would cause silent failures if missed.

**The two critical details that commonly cause Docker/Next.js failures:**
1. `ENV HOSTNAME="0.0.0.0"` MUST be set in the runner stage — without it, the standalone server binds only to the container's internal hostname, making it unreachable from the LAN even with correct port mapping.
2. Static assets and public files are NOT included in `.next/standalone` — they must be copied manually: `.next/static` → `.next/standalone/.next/static` and `public` → `.next/standalone/public`.

**Primary recommendation:** Follow the official `vercel/next.js/examples/with-docker` Dockerfile pattern exactly, adapted to two stages (not three) since this project has no separate deps caching stage, with `node:22-alpine` as the locked base image.

---

## Standard Stack

### Core (all already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.3 | App with standalone output | Already installed; `output: 'standalone'` is a config flag, not a new package |
| node | 22-alpine | Docker base image | Matches locked decision D-02; LTS Node 22, Alpine for small images |

### No New npm Dependencies
All Docker packaging is infrastructure-level (Dockerfile, docker-compose.yml, `.dockerignore`) plus one new route file (`src/app/api/health/route.ts`). Zero new npm packages are required.

**Verification:**
```bash
# These are already in package.json — no new installs needed
next: 16.2.3  [VERIFIED: package.json]
bcryptjs: ^3.0.3  [VERIFIED: package.json - pure JS, no native modules]
undici: (transitive via Node.js 18+)  [VERIFIED: package.json uses undici.fetch directly]
```

---

## Architecture Patterns

### Standalone Output — How It Works
[VERIFIED: nextjs.org/docs/app/api-reference/config/next-config-js/output]

`output: 'standalone'` triggers `@vercel/nft` static analysis during `next build`. It produces:
- `.next/standalone/` — minimal Node server with all dependencies inlined (no `node_modules` install needed in runner)
- `.next/standalone/server.js` — the entry point (not `next-server.js` or `server/index.js`)
- `.next/static/` — static assets (NOT copied to standalone automatically — must be copied manually)
- `public/` — public assets (NOT copied to standalone automatically — must be copied manually)

### Dockerfile — Two-Stage Pattern

**Stage naming:** `builder` and `runner` (matches locked decisions D-02/D-03/D-04).

**COPY sequence in runner stage (order matters):**
```dockerfile
# Source: official vercel/next.js/examples/with-docker Dockerfile [VERIFIED: fetched 2026-04-24]
COPY --from=builder /app/public ./public
RUN mkdir .next && chown node:node .next
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
```

**Why `COPY .next/standalone ./` (not into a subdirectory):** The standalone directory contains `server.js` at its root. Copying it to `./` in `WORKDIR /app` places `server.js` at `/app/server.js`, matching `CMD ["node", "server.js"]`.

**Why `COPY .next/static ./.next/static`:** The standalone server expects static files at `.next/static` relative to its working directory. The `public` copy goes to `./public` (same level as `server.js`).

### HOSTNAME=0.0.0.0 — Required, Not Optional
[VERIFIED: nextjs.org/docs/app/api-reference/config/next-config-js/output + community confirmation]

The standalone `server.js` reads `process.env.HOSTNAME` to determine which network interface to bind. In a Docker container, `$HOSTNAME` defaults to the container ID. Without explicitly setting `HOSTNAME=0.0.0.0`, the server binds to the container ID hostname only — not reachable from the LAN.

```dockerfile
# In runner stage — REQUIRED for LAN accessibility
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV NODE_ENV=production
```

**Note on PORT:** The standalone server reads `process.env.PORT` automatically. Setting `ENV PORT=3000` makes it explicit and allows docker-compose `env_file` to override it if ever needed.

### Docker Compose Pattern

```yaml
# [ASSUMED] Standard docker-compose.yml pattern for Next.js
services:
  app:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
    env_file:
      - .env.prod
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

**`start_period`:** Not in locked decisions but strongly recommended. Next.js standalone takes 2-5 seconds to cold-start; without `start_period`, Docker may mark the container unhealthy before it has finished starting.

**`wget` vs `curl`:** Alpine Linux includes `wget` by default but NOT `curl`. The locked decision correctly uses `wget`. [VERIFIED: standard Alpine base image]

### Health Route Pattern

The `/api/health` route follows the exact same handler pattern as existing routes in this project:

```typescript
// src/app/api/health/route.ts
// Source: mirrors existing route pattern in src/app/api/clients/route.ts [VERIFIED: read codebase]
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: true })
}
```

No session check — this is an internal healthcheck endpoint, not a user-facing route. No `server-only` guard needed (no secrets, no sensitive imports).

### .dockerignore Pattern

```
node_modules
.next
.env*
.git
README.md
.planning
*.pem
.DS_Store
coverage
```

**Why `.next` is excluded:** The builder stage runs `next build` inside the container. Copying `.next` from the host would import a stale build artifact — the build must happen inside Docker to capture correct dependencies and paths.

### Anti-Patterns to Avoid
- **`ENV UNIFI_API_KEY=...` in Dockerfile:** Bakes secrets into image layers. Use `env_file` at runtime only (locked in D-05).
- **Running as root in runner stage:** Not locked, but official Next.js example uses `USER node` — the `node` user exists in official Node.js Alpine images.
- **Omitting `ENV HOSTNAME="0.0.0.0"`:** Server binds to container ID hostname, unreachable from LAN. This is the most common gotcha for Next.js Docker deployments.
- **`COPY . .` in runner stage:** Copies all source code into the production image. Runner stage should only copy from builder outputs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dependency bundling for production | Custom `npm prune` scripts | `output: 'standalone'` | `@vercel/nft` traces exactly what each route needs; manual pruning misses dynamic imports |
| Secret injection | `ARG`/`ENV` in Dockerfile | `env_file` in docker-compose.yml | `ARG` values are visible in `docker history`; `env_file` injects only at runtime |
| Static asset serving in container | Custom Express/nginx layer | Copy to `.next/standalone/.next/static` and `public` | standalone `server.js` auto-serves these paths when they exist in the expected locations |

---

## Common Pitfalls

### Pitfall 1: HOSTNAME Not Set — Container Unreachable from LAN
**What goes wrong:** App starts successfully inside the container but every request from a LAN device (including the host machine) gets connection refused on port 3000.
**Why it happens:** `server.js` binds to `process.env.HOSTNAME` which defaults to the Docker container's hostname (container ID string). The server is listening on a hostname that resolves nowhere outside the container.
**How to avoid:** Set `ENV HOSTNAME="0.0.0.0"` in the runner stage (or in docker-compose env_file). The official Next.js example sets this in the Dockerfile.
**Warning signs:** `docker ps` shows port mapping `0.0.0.0:3000->3000/tcp` but browser on LAN device cannot reach the app.

### Pitfall 2: Missing Static Assets — 404s for CSS/JS
**What goes wrong:** App loads but all styling is missing; browser console shows 404s for `/_next/static/...` files.
**Why it happens:** `output: 'standalone'` intentionally omits static assets from `.next/standalone` (they're CDN-intended). If the COPY commands in the Dockerfile don't copy them into the runner stage, they don't exist.
**How to avoid:** Always include both COPY lines:
```dockerfile
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
```
**Warning signs:** App renders but looks completely unstyled; `/_next/static/chunks/main.js` returns 404.

### Pitfall 3: .env.prod Not in .gitignore
**What goes wrong:** Real `UNIFI_API_KEY` and `AUTH_SECRET` are committed to git history.
**Why it happens:** The `.gitignore` currently uses `.env*` wildcard (which WOULD catch it), but `.env.prod.example` needs to be explicitly allowed.
**How to avoid:** Add `.env.prod` as an explicit entry and add `!.env.prod.example` exception — same pattern as existing `.env.local.example` exception in `.gitignore`.
**Existing pattern:** `.gitignore` already has `!.env.local.example` and `!.env.vercel-mock` — `.env.prod.example` follows the same pattern.

### Pitfall 4: bcryptjs Is Pure JS — No Native Build Required
**What goes wrong:** Confusion with `bcrypt` (native module, requires python/gcc on Alpine).
**Why it doesn't apply here:** This project uses `bcryptjs@^3.0.3` — pure JavaScript implementation, no native compilation, no Alpine build dependencies needed. [VERIFIED: package.json]
**Implication:** The Dockerfile does NOT need `apk add python make g++` before `npm ci`.

### Pitfall 5: undici in Docker — No Behavioral Difference
**What goes wrong:** Assumption that containerizing changes how undici handles `rejectUnauthorized: false`.
**Why it doesn't apply:** The scoped `undici.Agent` with `rejectUnauthorized: false` (implemented in Phase 6) is a Node.js process-level configuration, not a system TLS configuration. It works identically inside a Docker container. Alpine does not affect `undici`'s TLS behavior — undici uses Node.js's built-in TLS stack, not the OS certificate store.
**Implication:** No TLS-related changes are needed for Docker. Phase 6's implementation carries forward unchanged.

### Pitfall 6: `next build` Requires Env Vars at Build Time (Sometimes)
**What goes wrong:** Build fails with `UNIFI_HOST is not defined` or similar if the app reads env vars at module initialization (top-level `const`).
**Why it applies here:** Phase 6 explicitly made `baseUrl()` read `process.env.UNIFI_HOST` inside the function body (not top-level) specifically to avoid this. [VERIFIED: STATE.md — "baseUrl() reads process.env.UNIFI_HOST inside function body so tests can mutate process.env between cases"]
**Implication:** `next build` in the builder stage will succeed without `UNIFI_HOST` set. No `ARG` injection needed for build-time env vars.

---

## Code Examples

### next.config.ts — Minimal Change
```typescript
// Source: nextjs.org/docs/app/api-reference/config/next-config-js/output [VERIFIED]
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

### Dockerfile — Full Two-Stage
```dockerfile
# Source: adapted from vercel/next.js/examples/with-docker [VERIFIED: fetched 2026-04-24]
# Using two stages (not three) — no separate deps caching layer needed for npm ci

FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
ENV NODE_ENV=production
RUN npm run build

# --- Runner stage ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy public assets
COPY --from=builder /app/public ./public

# Create .next directory with correct ownership
RUN mkdir .next

# Copy standalone server and bundled deps
COPY --from=builder /app/.next/standalone ./

# Copy static assets (not included in standalone automatically)
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

**Note on non-root user:** The official example adds `USER node` and `--chown=node:node` on COPY commands for security. This is Claude's discretion per CONTEXT.md — recommended for production hygiene but not required for LAN household use.

### docker-compose.yml
```yaml
# [ASSUMED] Standard pattern — verified against Docker Compose docs format
services:
  app:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
    env_file:
      - .env.prod
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

### .env.prod.example
```bash
# UniFi Console — LAN direct access
UNIFI_HOST="192.168.1.1"
UNIFI_API_KEY="your-api-key-here"

# App authentication credentials
ADMIN_USER="admin"
ADMIN_PASSWORD="bcrypt-hash-here"
FAMILY_USER="family"
FAMILY_PASSWORD="bcrypt-hash-here"

# Session signing key — minimum 32 characters, random
SESSION_SECRET="minimum-32-character-random-string-here"

# Port (default: 3000)
PORT=3000
```

### src/app/api/health/route.ts
```typescript
// Mirrors pattern from src/app/api/clients/route.ts [VERIFIED: read codebase]
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: true })
}
```

---

## .gitignore Changes Required

Current `.gitignore` has `.env*` wildcard (catches `.env.prod`) and `!.env.local.example` exception. Need to add:
```
!.env.prod.example
```

The `.env.prod` file itself is already caught by the `.env*` wildcard — no new entry needed. Only the example file needs an explicit allow.
[VERIFIED: read .gitignore]

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker CLI | DEPLOY-02 (image build) | ✗ | — | Human operator runs build on LAN host |
| Docker Compose | DEPLOY-03 (compose up) | ✗ | — | Human operator runs on LAN host |
| Node.js (local) | `npm run build` smoke test | ✓ | (inferred from working dev environment) | — |

**Missing dependencies with no fallback:**
- Docker and Docker Compose are not available in this development environment. All Docker verification steps (build, run, compose up) require manual execution on the deployment host by the household operator. Plans must account for this: no automated Docker smoke tests, UAT steps are manual-only.

**Missing dependencies with fallback:**
- None.

**Impact on planning:** Plans can automate `npm run build` to verify standalone output exists. Docker build/run steps must be written as human UAT instructions, not automated tasks.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test:run` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | `next build` completes with `output: 'standalone'` and `.next/standalone` is present | smoke | `npm run build && test -d .next/standalone` | ❌ Wave 0 |
| DEPLOY-02 | Docker image builds and runs | manual-only | — | ❌ manual (Docker unavailable in dev env) |
| DEPLOY-03 | `docker-compose up -d` starts; container recovers after stop | manual-only | — | ❌ manual |
| DEPLOY-04 | Built image contains no secrets | manual-only | `docker history <image> \| grep -v UNIFI` | ❌ manual |
| DEPLOY-05 | Household member can follow README to reach running app | manual-only | — | ❌ manual (human judgment required) |
| DEPLOY-09 | `/api/health` returns `{ ok: true }` with HTTP 200 | unit | `npm run test:run -- tests/app/api/health.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:run`
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green + human UAT for Docker steps before verification

### Wave 0 Gaps
- [ ] `tests/app/api/health.test.ts` — covers DEPLOY-09 (health route returns `{ ok: true }`, HTTP 200, no auth required)
- [ ] Standalone build smoke: can be a bash assertion in Wave 0, not a Vitest test — `npm run build && ls .next/standalone/server.js`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Health route is public — by design |
| V3 Session Management | no | No new session logic |
| V4 Access Control | no | Health route intentionally unauthenticated |
| V5 Input Validation | no | Health route has no input |
| V6 Cryptography | no | No new crypto |
| V7 Error Handling | yes | Health route should not leak stack traces |
| Secrets in image | **yes** | No `ENV` for secrets in Dockerfile — use `env_file` at runtime only |

### Known Threat Patterns for Docker Deployment

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secrets baked into Docker layer via `ENV` | Information Disclosure | No `ENV` directives for secrets in Dockerfile (D-05); `docker history` would expose them |
| `.env.prod` committed to git | Information Disclosure | `.env*` wildcard in `.gitignore` already catches it; verify explicitly |
| Health route leaking sensitive info | Information Disclosure | Return only `{ ok: true }` — no env vars, no system info, no stack traces |
| Container running as root | Elevation of Privilege | Consider `USER node` in runner stage (Claude's discretion per CONTEXT.md) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `docker-compose.yml` syntax uses `services:` top-level key (Compose v2 format, no `version:` field) | Code Examples | Minor: older Docker Compose may require `version: "3.9"` header — easily fixed |
| A2 | `start_period: 10s` is sufficient for Next.js standalone cold-start | Code Examples | Low: container may be marked unhealthy on slow hardware; increase to 30s if needed |
| A3 | `AUTH_SECRET` in `.env.prod.example` refers to `SESSION_SECRET` from existing `.env.local.example` | .env.prod.example | Medium: if variable names differ, app won't authenticate. Must cross-check with actual env var names in `src/lib/session.ts` |

**Note on A3:** The CONTEXT.md D-11 lists `AUTH_SECRET` but `.env.local.example` uses `SESSION_SECRET`. The planner should verify which name the session library actually reads from `process.env`.

---

## Open Questions

1. **`AUTH_SECRET` vs `SESSION_SECRET` naming in `.env.prod.example`**
   - What we know: D-11 specifies `AUTH_SECRET` as a documented var; `.env.local.example` uses `SESSION_SECRET`
   - What's unclear: Does `src/lib/session.ts` read `AUTH_SECRET` or `SESSION_SECRET`? These may be the same thing under different names, or the context doc may have used a generic name.
   - Recommendation: Planner task should read `src/lib/session.ts` to verify exact env var name before writing `.env.prod.example`.

2. **Non-root user in runner stage**
   - What we know: Official Next.js Docker example uses `USER node` with `--chown=node:node` on COPY commands
   - What's unclear: Is this required for the `node:22-alpine` image? (Answer: yes, `node` user exists in official Node.js images)
   - Recommendation: Include `USER node` — it's Claude's discretion and the official example does it. Document in README that this is a security best practice.

---

## Sources

### Primary (HIGH confidence)
- [nextjs.org/docs/app/api-reference/config/next-config-js/output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) — standalone output mode, copy commands, PORT/HOSTNAME env vars [VERIFIED: fetched 2026-04-24, version 16.2.4]
- [nextjs.org/docs/app/getting-started/deploying](https://nextjs.org/docs/app/getting-started/deploying) — Docker deployment options, official with-docker example link [VERIFIED: fetched 2026-04-24]
- `vercel/next.js/examples/with-docker/Dockerfile` — official multi-stage Dockerfile pattern [VERIFIED: fetched 2026-04-24]
- `package.json` in this repo — confirms `bcryptjs` (pure JS), `next: 16.2.3`, no native modules [VERIFIED: read file]
- `.gitignore` in this repo — confirms `.env*` wildcard and exception pattern [VERIFIED: read file]
- `src/app/api/clients/route.ts` — existing route handler pattern for health route [VERIFIED: read file]
- `STATE.md` — confirms `baseUrl()` reads env inside function body (no build-time env var requirement) [VERIFIED: read file]

### Secondary (MEDIUM confidence)
- WebSearch: HOSTNAME=0.0.0.0 confirmed as required for Docker standalone — corroborated by Next.js GitHub issues #58657, #44043 and official docs

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, no new dependencies
- Dockerfile pattern: HIGH — verified against official Next.js docs and example Dockerfile
- Architecture: HIGH — COPY paths and HOSTNAME requirement confirmed from official source
- Pitfalls: HIGH — all critical pitfalls verified against official docs or codebase inspection
- docker-compose.yml: MEDIUM — standard format, but exact YAML syntax is [ASSUMED]

**Research date:** 2026-04-24
**Valid until:** 2026-07-24 (stable domain — Docker standalone API unlikely to change in 90 days)
