---
created: 2026-05-17T03:42:43Z
title: Add /statusz health page
area: api
files: []
---

## Problem

No `/statusz` route exists in the app. Useful for quickly checking that the deployment is alive and core dependencies (DB, UniFi proxy) are reachable — standard ops page for internal tooling.

## Solution

Add a Next.js route at `src/app/statusz/page.tsx` (or `src/app/api/statusz/route.ts` for a JSON endpoint) that reports:
- App version / build info
- DB connectivity check
- UniFi Site Manager proxy reachability
- Uptime or last-checked timestamp

Access at `/statusz` in the browser. No auth required (or behind simple session check).
