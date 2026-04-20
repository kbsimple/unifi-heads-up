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

## Cross-Milestone Trends

| Milestone | Phases | Plans | Days | LOC | Req Coverage |
|-----------|--------|-------|------|-----|--------------|
| v1.0 MVP  | 4      | 16    | 5    | ~7,076 | 28/28 |
