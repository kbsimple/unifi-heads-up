---
phase: 18-per-client-app-visibility
plan: 02
status: complete
completed: 2026-07-18
---

## What was built

DPI probe API route and diagnostic page — the user-facing surface for validating the UniFi DPI endpoint.

### Files created / modified

- **`src/app/api/dpi/probe/route.ts`** — `GET /api/dpi/probe?mac={mac}`. Session-gated (401 on no session). 400 on missing mac. Dispatches to `probeDpiMock` when `UNIFI_MOCK=true`, otherwise `probeDpi`. Returns full `DpiProbeResult` JSON.
- **`tests/app/api/dpi/probe/route.test.ts`** — 6 tests: 401 no session, 400 missing mac, mock mode (probeDpiMock called, probeDpi not called), live mode (probeDpi called, probeDpiMock not called), body shape (status + decoded), mac string passthrough.
- **`src/middleware.ts`** — added `/dpi-probe` to `protectedRoutes` array (one-line change).
- **`src/app/dpi-probe/page.tsx`** — Client Component. MAC address text input + Probe button. On submit: `fetch /api/dpi/probe?mac={mac}` → raw JSON displayed in `<pre>`. Error display in red box. "← Dashboard" link. Zinc dark palette matching `/statusz` style.

### Test results

Full suite: 380 tests, 48 files — all pass. TypeScript: clean.

### Manual usage

1. `UNIFI_MOCK=true npm run dev`
2. Log in at `/login`
3. Navigate to `http://localhost:3000/dpi-probe`
4. Enter any MAC address and click Probe
5. Response shows `{ "status": "ok", "mock": true, "decoded": [ ... Youtube, Netflix, Slack ... ] }`

For live hardware: remove `UNIFI_MOCK` from environment, restart, use real device MAC from the dashboard.

## Self-Check: PASSED
