---
phase: 18-per-client-app-visibility
plan: 01
status: complete
completed: 2026-07-18
---

## What was built

DPI lookup bundle and probe library — the server-side foundation for the DPI probe tool.

### Files created

- **`src/lib/dpi/cat_app.json`** — Static compound-ID→name map (ubntwiki source, 200+ entries). Keys are compound IDs as strings; covers categories 0–255 and applications including YouTube (262256), Netflix (262276), Slack (39), WhatsApp (41), BitTorrent (65538), GitHub (196649), iCloud (196758).
- **`src/lib/dpi/lookup.ts`** — `decodeAppId(cat, app): AppLookup` using formula `(cat << 16) + app`. Imports `server-only`. Returns fallback `App {compoundId}` / `Category {cat}` for unknown IDs — never throws.
- **`src/lib/dpi/probe.ts`** — Exports: `probeDpi(macs)`, `probeDpiMock(macs)`, `inferStatus(raw)`, `decodeDpiResponse(raw)`. Scoped undici Agent (`rejectUnauthorized: false`) for self-signed cert. 10s timeout. Mock returns Youtube + Netflix + Slack entries with verified compound IDs.
- **`src/lib/dpi/lookup.test.ts`** — 8 tests: formula verification, known app decodes (YouTube/Netflix/Slack/BitTorrent), fallback behavior.
- **`src/lib/dpi/probe.test.ts`** — 12 tests: inferStatus (dpi_disabled/no_data/ok), decodeDpiResponse, probeDpiMock verification.

### Key exports for Plan 02

```typescript
// probe.ts
export function probeDpi(macs: string[]): Promise<DpiProbeResult>
export function probeDpiMock(macs: string[]): DpiProbeResult
export interface DpiProbeResult {
  status: 'ok' | 'dpi_disabled' | 'no_data' | 'error'
  raw: unknown
  decoded: DecodedApp[]
  mock?: true
}
```

### Test results

20 tests pass (0 failures).

## Self-Check: PASSED
