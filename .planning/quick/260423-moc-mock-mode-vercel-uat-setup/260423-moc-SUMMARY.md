---
phase: quick
plan: 260423-moc
subsystem: docs/deployment
tags: [mock, vercel, uat, readme, env]
dependency_graph:
  requires: [05-01 mock facade (UNIFI_MOCK=true support)]
  provides: [vercel-uat-deployment-path]
  affects: [README.md, .env.vercel-mock]
tech_stack:
  added: []
  patterns: [env-file-for-uat, gitignore-exception]
key_files:
  created:
    - .env.vercel-mock
  modified:
    - README.md
    - .gitignore
decisions:
  - ".env.vercel-mock committed (not gitignored) — contains no real secrets, only fixed UAT test credentials"
  - "Added !.env.vercel-mock exception to .gitignore to override the .env* catch-all"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-24T02:21:02Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Quick Task 260423-moc: Mock Mode Vercel UAT Setup Summary

Documented and enabled Vercel preview deployments running on mock data — `.env.vercel-mock` with real bcrypt hashes and `UNIFI_MOCK=true`, plus README "Vercel Preview / UAT" section with step-by-step setup and credential table.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create .env.vercel-mock with real bcrypt hashes | 89fb5e5 | `.env.vercel-mock`, `.gitignore` |
| 2 | Update README — Vercel UAT section + variable reference + .env.local UNIFI_MOCK | d79a0f2 | `README.md` |

## What Was Built

**`.env.vercel-mock`** — Copy-ready Vercel env file containing:
- `UNIFI_MOCK=true` to activate the mock facade
- Dummy `UNIFI_CONSOLE_ID` and `UNIFI_API_KEY` (satisfy Vercel "missing variable" checks without real credentials)
- `SESSION_SECRET` — 50-char UAT-only signing key
- `ADMIN_PASSWORD` / `FAMILY_PASSWORD` — real bcrypt hashes for `uat-admin` / `uat-family` (verified `true` via `bcryptjs.compareSync`)

**`README.md`** — Three edits:
1. New "Vercel Preview / UAT (Mock Mode)" section with how-it-works explanation, 6-step Vercel setup instructions, credential table, and mock data description
2. Variable Reference table updated: `UNIFI_MOCK` row added; `UNIFI_CONSOLE_ID` and `UNIFI_API_KEY` marked optional in mock mode
3. `.env.local` template block updated with commented `# UNIFI_MOCK=true` line

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added .gitignore exception for .env.vercel-mock**
- **Found during:** Task 1
- **Issue:** `.gitignore` had a `.env*` catch-all that would prevent `.env.vercel-mock` from being tracked. The plan states the file is safe to commit and should not be gitignored.
- **Fix:** Added `!.env.vercel-mock` exception line to `.gitignore`
- **Files modified:** `.gitignore`
- **Commit:** 89fb5e5

## Verification Results

All checks passed:
- `.env.vercel-mock` exists at repo root, not gitignored
- `UNIFI_MOCK=true` present
- `bcryptjs.compareSync('uat-admin', hash)` → `true`
- `bcryptjs.compareSync('uat-family', hash)` → `true`
- README contains "Vercel Preview / UAT" section
- README variable table includes `UNIFI_MOCK`

## Self-Check: PASSED

- `89fb5e5` — chore(260423-moc): add .env.vercel-mock for Vercel UAT mock deployment
- `d79a0f2` — docs(260423-moc): add Vercel UAT mock mode section to README
- `.env.vercel-mock` present at repo root
- `README.md` contains all required strings (verified by automated check)
