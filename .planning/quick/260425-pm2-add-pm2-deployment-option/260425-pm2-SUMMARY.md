---
quick_id: 260425-pm2
slug: add-pm2-deployment-option
status: complete
date: 2026-04-25
duration_minutes: 5
tasks_completed: 2
files_created:
  - ecosystem.config.cjs
files_modified:
  - README.md
commits:
  - hash: 118b0fb
    message: "chore(260425-pm2): add PM2 ecosystem config"
  - hash: 085b28b
    message: "docs(260425-pm2): add Self-Hosted / PM2 section to README"
---

# Quick Task 260425-pm2: Add PM2 Deployment Option — Summary

## One-liner

PM2 ecosystem config pointing at `.next/standalone/server.js` with `HOSTNAME=0.0.0.0`, plus a full Self-Hosted / PM2 README section covering Ubuntu systemd and macOS launchd boot integration.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create ecosystem.config.cjs | 118b0fb | ecosystem.config.cjs |
| 2 | Add Self-Hosted / PM2 section to README | 085b28b | README.md |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `ecosystem.config.cjs` exists at repo root with correct `cwd`, `HOSTNAME`, and `autorestart`
- README contains "Self-Hosted / PM2" heading with Ubuntu systemd and macOS launchd sections
- Both commits exist: 118b0fb, 085b28b
