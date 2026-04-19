# Quick Task 260418-ocd: Update README with comprehensive instructions for starting and testing the application

**Completed:** 2026-04-19
**Commit:** 528fb15

## What Was Done

Rewrote README.md from stock create-next-app boilerplate to a comprehensive project-specific guide.

## Changes

- **README.md** — full rewrite (149 lines added, 20 removed)
  - Project overview and tech stack
  - Prerequisites (Node 18.18+, Unifi console, API key)
  - Installation steps
  - Environment setup with all 7 required env vars documented (ADMIN_USER, ADMIN_PASSWORD, FAMILY_USER, FAMILY_PASSWORD, SESSION_SECRET, UNIFI_CONSOLE_ID, UNIFI_API_KEY)
  - Commands for generating bcrypt hashes and SESSION_SECRET
  - Dev server instructions with login notes
  - Testing section (watch mode + CI single-run)
  - Lint and type-check commands
  - Production build and Vercel deployment steps
  - Project structure tree
  - Troubleshooting section (4 common issues)
