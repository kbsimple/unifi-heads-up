---
phase: 07-docker-deployment
verified: 2026-04-24T21:58:00Z
status: human_needed
score: 7/10 must-haves verified (3 deferred to human UAT — Docker not installed in dev env)
overrides_applied: 0
re_verification: false
deferred:
  - truth: "docker build produces a runnable image and docker run starts the app responding on port 3000"
    addressed_in: "07-HUMAN-UAT.md UAT-01 / UAT-02"
    evidence: "ROADMAP SC-2: 'docker build produces a runnable image and docker run starts the app responding on the expected port'. Docker not installed in dev env — must be verified on deployment host."
  - truth: "docker compose up -d starts the container; restart: unless-stopped brings it back after host reboot"
    addressed_in: "07-HUMAN-UAT.md UAT-03"
    evidence: "ROADMAP SC-3: 'docker compose up -d starts the container; stopping and rebooting the host brings it back automatically'. Requires running Docker."
  - truth: "A household member can follow the written setup instructions and reach the running app on the LAN"
    addressed_in: "07-HUMAN-UAT.md UAT-06"
    evidence: "ROADMAP SC-5: 'A household member with no prior context can follow the written setup instructions and reach the running app on the LAN'. Requires end-to-end execution with Docker."
human_verification:
  - test: "UAT-01: docker compose up -d --build; docker compose ps"
    expected: "Build completes without errors; app service shows status Up; http://localhost:3000 shows login page"
    why_human: "Docker is not installed in the dev environment — image build and container run cannot be automated from this machine"
  - test: "UAT-02: Open http://<host-machine-ip>:3000 from a different LAN device"
    expected: "Login page loads; credentials from .env.prod work; dashboard shows real device data"
    why_human: "Requires running container on a LAN host — cannot verify from dev machine"
  - test: "UAT-03: docker compose stop && docker compose start; reboot host machine"
    expected: "Container restarts cleanly; app reachable after restart; after host reboot container comes up automatically without intervention"
    why_human: "Requires running container and host reboot — cannot automate"
  - test: "UAT-04: docker history $(docker compose images -q app) | head -30"
    expected: "Output does NOT contain UNIFI_HOST, UNIFI_API_KEY, or SESSION_SECRET"
    why_human: "Requires a built Docker image"
  - test: "UAT-05: docker inspect ... --format '{{.State.Health.Status}}'; curl http://localhost:3000/api/health"
    expected: "Health status shows healthy; curl returns {\"ok\":true} with HTTP 200"
    why_human: "Requires running container"
  - test: "UAT-06: Have a household member follow only the README Self-Hosted / Docker section"
    expected: "They reach the running login page without help beyond the README; all 8 env var table entries are clear enough to fill in unaided"
    why_human: "Usability/comprehension test requiring a real human reader"
---

# Phase 7: Docker Deployment — Verification Report

**Phase Goal:** The app runs as a self-hosted container on the local network with documented setup
**Verified:** 2026-04-24T21:58:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria + Plan Must-Haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `next build` completes with `output: 'standalone'` and `.next/standalone` directory is present | VERIFIED | `next.config.ts` line 4: `output: 'standalone'`; `.next/standalone/server.js` confirmed present on disk |
| 2 | `docker build` produces a runnable image and `docker run` starts the app responding on the expected port | DEFERRED | Dockerfile structure verified (two-stage, correct COPY sequence, HOSTNAME=0.0.0.0); actual image build requires Docker — see UAT-01/UAT-02 |
| 3 | `docker compose up -d` starts the container; restart policy brings it back after host reboot | DEFERRED | `docker-compose.yml` has `restart: unless-stopped` and correct healthcheck; runtime behavior requires Docker — see UAT-03 |
| 4 | The built Docker image contains no secrets — secrets injected at runtime via env file | VERIFIED (static) | `grep -E 'ENV (UNIFI_HOST|UNIFI_API_KEY|SESSION_SECRET)' Dockerfile` returns empty; `env_file: .env.prod` present in compose; runtime layer inspection requires Docker — see UAT-04 |
| 5 | A household member with no prior context can follow the written setup instructions and reach the running app on the LAN | DEFERRED | README Self-Hosted section verified complete (prerequisites, all 8 vars, build/start/update/stop, troubleshooting); end-to-end usability requires human — see UAT-06 |
| 6 | GET /api/health returns HTTP 200 with body `{ ok: true }` — no auth required | VERIFIED | 3/3 Vitest tests pass; route exports only `GET` returning `NextResponse.json({ ok: true })`; no session/auth imports |
| 7 | Dockerfile is a valid two-stage build (builder + runner) on node:22-alpine | VERIFIED | Lines 4+17: `FROM node:22-alpine AS builder` and `FROM node:22-alpine AS runner` confirmed |
| 8 | Runner stage sets `ENV HOSTNAME=0.0.0.0` so the container is reachable from the LAN | VERIFIED | Dockerfile line 24: `ENV HOSTNAME="0.0.0.0"` confirmed in runner stage |
| 9 | docker-compose.yml has `restart: unless-stopped` and `env_file: .env.prod` | VERIFIED | Both directives confirmed at lines 6 and 7–8 of docker-compose.yml |
| 10 | .env.prod.example documents all required runtime vars using SESSION_SECRET (not AUTH_SECRET) | VERIFIED | All 8 vars present: UNIFI_HOST, UNIFI_API_KEY, ADMIN_USER, ADMIN_PASSWORD, FAMILY_USER, FAMILY_PASSWORD, SESSION_SECRET, PORT |

**Score:** 7/10 truths verified (3 deferred to human UAT — Docker not installed in dev env)

### Deferred Items

Items not yet runnable from the dev environment — explicitly captured in 07-HUMAN-UAT.md.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Docker image builds and container starts on expected port | UAT-01/UAT-02 | ROADMAP SC-2; 07-HUMAN-UAT.md UAT-01, UAT-02 |
| 2 | restart: unless-stopped brings container back after host reboot | UAT-03 | ROADMAP SC-3; 07-HUMAN-UAT.md UAT-03 |
| 3 | Household member can follow README and reach running app | UAT-06 | ROADMAP SC-5; 07-HUMAN-UAT.md UAT-06 |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `next.config.ts` | standalone output configuration | VERIFIED | Contains `output: 'standalone'` |
| `src/app/api/health/route.ts` | unauthenticated health check endpoint | VERIFIED | Exports `GET`, returns `NextResponse.json({ ok: true })`, no auth imports |
| `tests/app/api/health/route.test.ts` | unit tests for health route | VERIFIED | 3/3 tests pass (HTTP 200, body `{ ok: true }`, no-auth) |
| `Dockerfile` | multi-stage Docker build | VERIFIED | Two stages, HOSTNAME=0.0.0.0, USER node, correct COPY sequence |
| `docker-compose.yml` | container orchestration with restart policy | VERIFIED | restart: unless-stopped, env_file, healthcheck with start_period: 10s |
| `.dockerignore` | build context exclusion list | VERIFIED | Excludes node_modules, .next, .env*, .git, .planning |
| `.env.prod.example` | runtime environment template | VERIFIED | All 8 vars with placeholder values, uses SESSION_SECRET |
| `README.md` | Self-Hosted / Docker deployment instructions | VERIFIED | Section present at line 215; covers all required topics |
| `.planning/phases/07-docker-deployment/07-HUMAN-UAT.md` | Manual Docker verification checklist | VERIFIED | Covers UAT-01 through UAT-06 mapping DEPLOY-02 through DEPLOY-05; sign-off table present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `next.config.ts` | `.next/standalone/server.js` | `npm run build` | VERIFIED | `output: 'standalone'` present; `server.js` confirmed on disk |
| Dockerfile runner stage | `.next/standalone` | `COPY --from=builder /app/.next/standalone ./` | VERIFIED | Line 36 matches required pattern |
| `docker-compose.yml` | `.env.prod` | `env_file` directive | VERIFIED | `env_file:` block at lines 7–8 |
| `docker-compose.yml` healthcheck | `/api/health` | `wget -qO-` | VERIFIED | Line 10: `wget -qO- http://localhost:3000/api/health || exit 1` |
| `README.md` Self-Hosted section | `.env.prod.example` | `cp .env.prod.example .env.prod` | VERIFIED | README line 227 contains `cp .env.prod.example .env.prod` |
| `README.md` Self-Hosted section | `docker-compose.yml` | `docker compose up -d --build` | VERIFIED | README contains `docker compose` 5 times including the primary start command |

### Data-Flow Trace (Level 4)

Not applicable — this phase produces configuration files, a static API endpoint, and documentation. No components rendering dynamic data were added.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Health route returns HTTP 200 | `npm run test:run -- tests/app/api/health/route.test.ts` | 3 passed | PASS |
| Standalone build artifact present | `ls .next/standalone/server.js` | File exists | PASS |
| No secrets in Dockerfile ENV | `grep -E 'ENV (UNIFI_HOST|UNIFI_API_KEY|SESSION_SECRET)' Dockerfile` | Empty output (exit 1) | PASS |
| .env.prod blocked by .gitignore | `git check-ignore -v .env.prod` | `.gitignore:34:.env*` match | PASS |
| .env.prod.example allowed by .gitignore | `git check-ignore -v .env.prod.example` | No match (exit 1) — file is tracked | PASS |
| Docker image builds + runs | `docker compose up -d --build` | SKIP — Docker not installed | DEFERRED to UAT-01 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DEPLOY-01 | 07-01-PLAN.md | Next.js app builds with `output: 'standalone'` | SATISFIED | `next.config.ts` has `output: 'standalone'`; `server.js` present |
| DEPLOY-02 | 07-02-PLAN.md | Multi-stage Dockerfile produces a runnable image | PARTIAL — static verified | Dockerfile structure fully verified; image build/run deferred to UAT-01/UAT-02/UAT-05 |
| DEPLOY-03 | 07-02-PLAN.md | docker-compose with restart: unless-stopped and env_file | PARTIAL — static verified | Compose file verified; runtime restart behavior deferred to UAT-03 |
| DEPLOY-04 | 07-02-PLAN.md | Sensitive config not baked into image | PARTIAL — static verified | No secret ENV directives in Dockerfile confirmed; runtime `docker history` inspection deferred to UAT-04 |
| DEPLOY-05 | 07-03-PLAN.md | Setup documented (build, start, env vars, LAN access) | SATISFIED (static) | README section covers all required topics; end-to-end usability deferred to UAT-06 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/health/route.ts` | 6 | `return NextResponse.json({ ok: true })` — static return | Info | Intentional — health endpoint is designed to return a static response. Not a stub. |

No blockers or warnings found. The health route's static return is the correct, intentional implementation.

### Human Verification Required

All items below require Docker installed on the deployment host. Use `.planning/phases/07-docker-deployment/07-HUMAN-UAT.md` as the execution checklist.

#### 1. Image Build and Container Start (DEPLOY-02)

**Test:** `docker compose up -d --build && docker compose ps`
**Expected:** Build completes without errors; `app` service shows `Up`; `http://localhost:3000` shows login page
**Why human:** Docker not installed in the dev environment

#### 2. LAN Reachability from Another Device (DEPLOY-02)

**Test:** Open `http://<host-machine-ip>:3000` from a phone or other device on the same network
**Expected:** Login page loads; credentials from `.env.prod` work; dashboard shows real device data
**Why human:** Requires a running container on a LAN host

#### 3. Container Recovery After Restart and Host Reboot (DEPLOY-03)

**Test:** `docker compose stop && docker compose start`; then reboot the host machine
**Expected:** Container restarts cleanly after compose stop/start; after host reboot the container comes back up automatically without manual intervention
**Why human:** Requires running container and host reboot

#### 4. No Secrets Baked Into Image (DEPLOY-04)

**Test:** `docker history $(docker compose images -q app) | head -30`
**Expected:** Output does NOT contain UNIFI_HOST, UNIFI_API_KEY, or SESSION_SECRET; only NODE_ENV, PORT, HOSTNAME appear as ENV entries
**Why human:** Requires a built Docker image

#### 5. Healthcheck Passes (DEPLOY-02 / DEPLOY-03)

**Test:** Wait 30s after start, then `docker inspect $(docker compose ps -q app) --format '{{.State.Health.Status}}'`; also `curl http://localhost:3000/api/health`
**Expected:** Health status shows `healthy`; curl returns `{"ok":true}` with HTTP 200
**Why human:** Requires running container

#### 6. README Followable End-to-End (DEPLOY-05)

**Test:** Have a household member follow only the README "Self-Hosted / Docker" section from scratch
**Expected:** They reach a running login page without help beyond the README; all 8 env var table entries are clear enough to fill in without asking
**Why human:** Usability and comprehension test requiring a real human reader

### Gaps Summary

No automated gaps. All statically-verifiable must-haves pass. The three items marked DEFERRED (SC-2, SC-3, SC-5) require Docker to be installed and cannot be verified from the dev machine — they are captured in `07-HUMAN-UAT.md` with concrete commands and acceptance criteria, and are the direct reason this verification is `human_needed` rather than `passed`.

---

_Verified: 2026-04-24T21:58:00Z_
_Verifier: Claude (gsd-verifier)_
