---
phase: 07-docker-deployment
plan: 02
subsystem: docker-packaging
tags: [docker, dockerfile, docker-compose, deployment, standalone]
dependency_graph:
  requires: [07-01]
  provides: [Dockerfile, docker-compose.yml, .dockerignore, .env.prod.example]
  affects: [deployment, LAN reachability]
tech_stack:
  added: [node:22-alpine, Docker multi-stage build, Docker Compose v2]
  patterns: [standalone Next.js, runtime secret injection, non-root container user]
key_files:
  created:
    - Dockerfile
    - docker-compose.yml
    - .dockerignore
    - .env.prod.example
  modified:
    - .gitignore
decisions:
  - "ENV HOSTNAME=0.0.0.0 in runner stage — required for LAN reachability from host to container"
  - "USER node in runner stage — non-root execution per threat model T-07-02-03"
  - "No ENV directives for secrets — runtime injection only via env_file per D-05/T-07-02-01"
  - "start_period: 10s in healthcheck — allows Next.js standalone cold-start before first probe"
  - ".env.prod.example uses SESSION_SECRET (not AUTH_SECRET) — confirmed in src/lib/session.ts"
metrics:
  duration: "8 minutes"
  completed: "2026-04-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 1
---

# Phase 7 Plan 2: Docker Packaging Summary

**One-liner:** Multi-stage Dockerfile (node:22-alpine) with ENV HOSTNAME=0.0.0.0, Compose with restart/healthcheck, and runtime-only secret injection via env_file.

## What Was Built

Four Docker packaging artifacts were created to enable self-hosted LAN deployment of the Next.js standalone app.

### Dockerfile

Two-stage build (builder + runner) on `node:22-alpine`:
- Builder: `npm ci` then `npm run build` (bcryptjs is pure JS — no native build tools needed)
- Runner: copies `public`, `.next/standalone`, `.next/static` in correct sequence
- `ENV HOSTNAME="0.0.0.0"` in runner — critical for LAN reachability
- `USER node` — non-root execution
- No ENV directives for `UNIFI_HOST`, `UNIFI_API_KEY`, or `SESSION_SECRET`
- `CMD ["node", "server.js"]` — standalone entry point

### docker-compose.yml

Compose v2 format (no `version:` field):
- Single `app` service, port `3000:3000`
- `restart: unless-stopped` — automatic recovery after host reboot
- `env_file: .env.prod` — runtime secret injection, never baked into image
- Healthcheck: `wget -qO- http://localhost:3000/api/health || exit 1`, interval 30s, timeout 5s, retries 3, `start_period: 10s`

### .dockerignore

Excludes `node_modules`, `.next`, `.env*`, `.git`, `.planning`, `README.md`, `*.pem`, `.DS_Store`, `coverage` from build context.

### .env.prod.example

Template committed to repo with placeholder values. Documents: `UNIFI_HOST`, `UNIFI_API_KEY`, `ADMIN_USER`, `ADMIN_PASSWORD`, `FAMILY_USER`, `FAMILY_PASSWORD`, `SESSION_SECRET`, `PORT`. Uses `SESSION_SECRET` (confirmed correct name from `src/lib/session.ts`).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Dockerfile | 2000658 | Dockerfile |
| 2 | docker-compose.yml, .dockerignore, .env.prod.example | d7fafc0 | docker-compose.yml, .dockerignore, .env.prod.example, .gitignore |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

All four threats addressed:

| Threat | Mitigation | Verified |
|--------|-----------|---------|
| T-07-02-01: Secrets in Dockerfile ENV | No ENV for UNIFI_HOST/UNIFI_API_KEY/SESSION_SECRET | `grep -E 'ENV (UNIFI|SESSION)' Dockerfile` returns empty |
| T-07-02-02: .env.prod committed to git | .env* in .gitignore; only .env.prod.example committed | .gitignore reviewed |
| T-07-02-03: Container running as root | `USER node` in runner stage | Present in Dockerfile |
| T-07-02-04: Container not recovering after reboot | `restart: unless-stopped` | Present in docker-compose.yml |

## Verification Results

```
All files present: PASS
HOSTNAME="0.0.0.0" in Dockerfile: PASS
No secrets in Dockerfile ENV: PASS
restart: unless-stopped in docker-compose.yml: PASS
env_file in docker-compose.yml: PASS
SESSION_SECRET in .env.prod.example: PASS
node_modules in .dockerignore: PASS
Test suite: 5 failed / 28 passed (pre-existing failures, unrelated to Docker files — confirmed by running suite on clean state before changes)
```

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. Docker packaging files only.

## Self-Check: PASSED

- Dockerfile: FOUND at /Users/ffaber/claude-projects/unifi-api/Dockerfile
- docker-compose.yml: FOUND at /Users/ffaber/claude-projects/unifi-api/docker-compose.yml
- .dockerignore: FOUND at /Users/ffaber/claude-projects/unifi-api/.dockerignore
- .env.prod.example: FOUND at /Users/ffaber/claude-projects/unifi-api/.env.prod.example
- Commit 2000658 (Dockerfile): FOUND
- Commit d7fafc0 (compose/dockerignore/example): FOUND
