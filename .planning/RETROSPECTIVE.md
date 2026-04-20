# Retrospective

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-19
**Phases:** 4 | **Plans:** 16

### What Was Built

- Secure JWT authentication with middleware route protection and dark-themed login UI
- Real-time device traffic dashboard with SWR 60s polling and color-coded status badges
- Firewall rule management — toggle on/off with optimistic UI and error feedback
- Device groups with localStorage persistence, CRUD modals, aggregated traffic status
- 24-hour traffic history charts (Recharts) for site and individual clients
- Full Vitest+RTL test suite covering all 5 UAT scenarios

### What Worked

- Phase-by-phase planning kept scope tight — no feature creep
- useRef accumulation pattern for traffic history was clean and avoided render churn
- Vitest+RTL automated all human UAT scenarios effectively, replacing manual testing
- yolo mode kept execution fast without approval gates
- shadcn/ui + Tailwind 4 gave a polished dark UI with minimal friction

### What Was Inefficient

- REQUIREMENTS.md traceability table was never updated during execution — created documentation debt resolved only at milestone close
- Quick task status files not written, causing false "missing" audit flags
- Phase 04 VERIFICATION.md left as human_needed with no follow-through

### Patterns Established

- Lazy JWT key encoding for Vitest env var timing
- jose mock in jsdom for edge-compatible crypto
- SWR double-mock pattern for context provider + inner consumer
- React context with useRef for polling-side-effect accumulation (no re-renders)
- ClientList split into Inner + wrapper for clean provider scoping

### Key Lessons

- Update REQUIREMENTS.md traceability during phase execution, not retroactively
- Write quick task STATUS.md files at task completion to avoid audit noise
- Human verification steps should be scheduled explicitly, not left as open items

---

---

## Milestone: v1.1 — Dev Mocking

**Shipped:** 2026-04-19
**Phases:** 1 (Phase 5) | **Plans:** 2

### What Was Built

- Module-level UNIFI_MOCK facade (index.ts) switching between mock and real client at module init
- mock.ts with 6 network clients (all 4 traffic bands) and 3 firewall policies with in-memory toggle state
- dev.sh wired with `UNIFI_MOCK=true` — no credentials required for local development
- 15 new Vitest tests: 11 mock unit tests (MOCK-04–08) + 4 facade smoke tests
- Repaired 2 route test vi.mock targets broken by the facade introduction

### What Worked

- Two-plan structure was exactly right — implementation (05-01) and tests (05-02) as separate units
- Facade pattern kept production code untouched — zero risk to real client
- Self-contained toggle tests (read/flip/assert/restore) avoided beforeEach complexity
- yolo mode + tight plan scope = ~18 min total execution for both plans

### What Was Inefficient

- Three pre-existing test failures (layout/page tests referencing `(dashboard)` path) were carried through both plans and only fixed at the very end — could have been caught and fixed in 05-01
- REQUIREMENTS.md traceability not updated during execution (same pattern as v1.0)

### Patterns Established

- Conditional re-export facade at index.ts for environment-switched implementations
- vi.mock hoisting with server-only + both client/mock modules to prevent real network access in tests
- Self-contained toggle test pattern: read → flip → assert → restore (no global state leakage)

### Key Lessons

- Fix obviously broken existing tests at the start of the phase, not the end — they cause noise throughout
- Update REQUIREMENTS.md traceability table during phase execution (still not doing this)

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Days | LOC | Req Coverage |
|-----------|--------|-------|------|-----|--------------|
| v1.0 MVP  | 4      | 16    | 5    | ~7,076 | 8/8 reqs |
| v1.1 Dev Mocking | 1 | 2 | 1 | ~9 files | 8/8 reqs |
