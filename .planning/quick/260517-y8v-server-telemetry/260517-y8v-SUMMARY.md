---
phase: quick-260517-y8v
plan: 01
subsystem: telemetry
tags: [instrumentation, diagnostics, error-boundary, observability]
tech-stack:
  added: []
  patterns: [React class component error boundary, Next.js instrumentation hook, server-only route]
key-files:
  created:
    - src/app/api/statusz/route.ts
    - src/components/ErrorBoundary.tsx
  modified:
    - src/instrumentation.ts
    - src/app/layout.tsx
decisions:
  - "buildId falls back to 'dev' — Next.js does not expose build ID in process.env by default"
  - "Toaster kept outside ErrorBoundary so toast notifications survive UI errors"
  - "/api/statusz left unauthenticated — home LAN dashboard, no secrets exposed (per threat model T-y8v-01)"
metrics:
  duration: "~10 min"
  completed: "2026-05-17"
  tasks: 2
  files: 4
---

# Quick Task 260517-y8v: Server Telemetry Summary

**One-liner:** Startup diagnostics logger in instrumentation.ts, live `/api/statusz` process health endpoint, and React class component error boundary wired into root layout.

## What Was Implemented

### Task 1: Startup logger + /api/statusz (commit bd32342)

**src/instrumentation.ts** — Extended the existing `register()` function to emit a structured `console.log('[server] startup', {...})` after `startRecorder()` runs. Logs `nodeVersion`, `nodeEnv`, `buildId`, and `startedAt` ISO timestamp. The `startRecorder()` call is preserved unchanged.

**src/app/api/statusz/route.ts** — New unauthenticated GET endpoint. Module-level `startedAt = Date.now()` captures load time. Returns JSON: `uptime` (seconds since module load), `buildId`, `nodeVersion`, `memoryMb` (RSS), `nodeEnv`. Imports `server-only` to prevent accidental client bundling.

### Task 2: ErrorBoundary + root layout wiring (commit db7ed6d)

**src/components/ErrorBoundary.tsx** — `'use client'` React class component implementing `getDerivedStateFromError` and `componentDidCatch`. Fallback UI shows error message with a reload button, styled to match zinc-950 dark theme. Logs caught errors via `console.error('[ErrorBoundary] caught', ...)`.

**src/app/layout.tsx** — Imported `ErrorBoundary` and wrapped `{children}` inside it. `<Toaster>` remains outside the boundary so toast notifications still work if the main UI errors.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None beyond what is already in the plan's threat model (T-y8v-01: /api/statusz information disclosure — accepted for home LAN use).

## Self-Check

- [x] src/instrumentation.ts exists and contains startRecorder() + startup log
- [x] src/app/api/statusz/route.ts exists and exports GET
- [x] src/components/ErrorBoundary.tsx exists as class component with 'use client'
- [x] src/app/layout.tsx wraps {children} with ErrorBoundary, Toaster outside
- [x] commit bd32342 exists
- [x] commit db7ed6d exists
- [x] npx tsc --noEmit — zero new errors in src/ files (pre-existing test file errors unchanged)
