---
status: partial
phase: 18-per-client-app-visibility
source: [18-VERIFICATION.md]
started: 2026-07-18T15:30:00Z
updated: 2026-07-18T15:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Middleware redirect — unauthenticated access to /dpi-probe

expected: Open a private/incognito browser window and navigate to `http://localhost:3000/dpi-probe` without logging in. Browser should redirect to `http://localhost:3000/login` and the DPI probe form is never shown.
result: [pending]

### 2. End-to-end probe flow (mock mode)

expected: With `UNIFI_MOCK=true` in `.env.local`, run `npm run dev`, log in, navigate to `/dpi-probe`, enter `aa:bb:cc:dd:ee:01`, click Probe. The `<pre>` block should render JSON with `"status": "ok"`, `"mock": true`, and decoded array containing Youtube (compoundId 262256), Netflix (compoundId 262276), Slack (compoundId 39).
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
