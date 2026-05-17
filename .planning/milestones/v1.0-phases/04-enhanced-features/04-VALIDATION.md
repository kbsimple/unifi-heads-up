---
phase: 4
slug: enhanced-features
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | GRUP-05 | T-04-01 | N/A | unit | `npm test -- --grep "useLocalStorage"` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | GRUP-05 | T-04-02 | Validate on read | unit | `npm test -- --grep "useLocalStorage.*parse"` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | GRUP-01-04 | T-04-01 | N/A | unit | `npm test -- --grep "useGroups"` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | D-01 | — | N/A | unit | `npm test -- --grep "navigation.*groups"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | GRUP-03 | — | N/A | unit | `npm test -- --grep "DeviceChip"` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | GTRA-01, GTRA-02 | — | N/A | unit | `npm test -- --grep "GroupCard"` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 2 | GRUP-01, GRUP-02 | — | N/A | unit | `npm test -- --grep "CreateGroupModal"` | ❌ W0 | ⬜ pending |
| 04-02-04 | 02 | 2 | GRUP-01-04 | — | N/A | unit | `npm test -- --grep "GroupList"` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 3 | HIST-01-03 | — | N/A | unit | `npm test -- --grep "TrafficHistoryContext"` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 3 | HIST-01-03 | — | N/A | unit | `npm test -- --grep "TrafficChart"` | ❌ W0 | ⬜ pending |
| 04-03-03 | 03 | 3 | HIST-02 | — | N/A | unit | `npm test -- --grep "ClientCard.*history"` | ❌ W0 | ⬜ pending |
| 04-03-04 | 03 | 3 | HIST-01 | — | N/A | unit | `npm test -- --grep "Dashboard.*traffic"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/hooks/use-local-storage.test.ts` — covers GRUP-05, T-04-01, T-04-02
- [ ] `tests/hooks/use-groups.test.ts` — covers GRUP-01 through GRUP-04
- [ ] `tests/components/groups/device-chip.test.tsx` — covers GRUP-03
- [ ] `tests/components/groups/group-card.test.tsx` — covers GTRA-01, GTRA-02
- [ ] `tests/components/groups/create-group-modal.test.tsx` — covers GRUP-01, GRUP-02
- [ ] `tests/components/groups/group-list.test.tsx` — covers GRUP-01-04 integration
- [ ] `tests/components/dashboard/traffic-chart.test.tsx` — covers HIST-01, HIST-02, HIST-03
- [ ] `tests/contexts/traffic-history-context.test.tsx` — covers history accumulation logic

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LocalStorage persistence after browser refresh | GRUP-05 | Requires actual browser session | Create a group, refresh browser, verify group still exists |
| 24-hour history accumulation | HIST-01 | Requires 24 hours of continuous session | Check chart shows hourly buckets after extended session |

*Note: Both have automated tests for logic; manual verification confirms browser environment integration.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending