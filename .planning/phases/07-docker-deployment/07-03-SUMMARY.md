---
phase: 07-docker-deployment
plan: 03
subsystem: documentation
tags: [readme, docker, deployment, uat, household-user]
dependency_graph:
  requires: []
  provides: [README-docker-section, 07-HUMAN-UAT]
  affects: [README.md]
tech_stack:
  added: []
  patterns: [plain-english-docs, household-reader-instructions]
key_files:
  created:
    - .planning/phases/07-docker-deployment/07-HUMAN-UAT.md
  modified:
    - README.md
decisions:
  - "Appended Docker section after Troubleshooting (plan-specified position) — existing README content untouched"
  - "UAT covers 6 distinct scenarios mapping DEPLOY-02 through DEPLOY-05 with concrete shell commands"
metrics:
  duration: 85s
  completed: 2026-04-25
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
  files_created: 1
---

# Phase 7 Plan 3: Documentation and Human UAT Summary

Plain-English "Self-Hosted / Docker" section added to README.md and 07-HUMAN-UAT.md created with a 6-step manual Docker verification checklist covering DEPLOY-02 through DEPLOY-05.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | README.md Self-Hosted / Docker section | 2b2a7a2 | README.md (+86 lines) |
| 2 | 07-HUMAN-UAT.md manual Docker verification checklist | 239f4d0 | .planning/phases/07-docker-deployment/07-HUMAN-UAT.md (created, +115 lines) |

## What Was Built

**README.md Self-Hosted / Docker section** (Task 1) — Appended after the existing Troubleshooting section. Covers:
- Prerequisites (Docker Desktop + cloned repo)
- Step 1: copy `.env.prod.example` to `.env.prod` with an 8-variable reference table (`UNIFI_HOST`, `UNIFI_API_KEY`, `ADMIN_USER`, `ADMIN_PASSWORD`, `FAMILY_USER`, `FAMILY_PASSWORD`, `SESSION_SECRET`, `PORT`)
- bcrypt hash and SESSION_SECRET generation commands
- Step 2: `docker compose up -d --build`
- Step 3: LAN access URL with explanation
- Update workflow (`git pull && docker compose up -d --build`)
- Stop command with note about `restart: unless-stopped`
- Docker-specific troubleshooting (firewall, permissions, healthcheck)

**07-HUMAN-UAT.md** (Task 2) — Manual verification checklist for Docker steps that cannot be automated:
- UAT-01: image builds and container starts (DEPLOY-02)
- UAT-02: reachable from a different LAN device (DEPLOY-02)
- UAT-03: container recovers after restart, including host reboot simulation (DEPLOY-03)
- UAT-04: no secrets baked into the image via `docker history` inspection (DEPLOY-04)
- UAT-05: healthcheck endpoint returns `{"ok":true}` (DEPLOY-02, DEPLOY-03)
- UAT-06: README followable end-to-end by a household member (DEPLOY-05)
- Sign-off table for phase completion sign-off

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. This plan produces documentation only — no data rendering or UI components.

## Threat Flags

None. README documents only placeholder values (same as `.env.prod.example`). Instructions direct users to `cp .env.prod.example .env.prod` and fill in real values — no real secrets appear in docs (T-07-03-01 mitigated). UAT-04 explicitly verifies no secrets in image (T-07-03-02 accepted).

## Test Results

Pre-existing failures: 5 test files, 12 tests (unchanged from before this plan — no regressions). These failures are in API route tests unrelated to documentation changes and were present before plan execution.

## Self-Check: PASSED

Files verified:
- README.md — FOUND, contains "Self-Hosted / Docker" (grep count: 1)
- .planning/phases/07-docker-deployment/07-HUMAN-UAT.md — FOUND, contains DEPLOY-02 (grep count: 4)

Commits verified:
- 2b2a7a2 — docs(07-03): add Self-Hosted / Docker section to README
- 239f4d0 — docs(07-03): add 07-HUMAN-UAT.md — manual Docker verification checklist
