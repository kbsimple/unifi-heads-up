---
phase: 03
slug: firewall-control
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-18
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | FWRC-01 | — | N/A | unit | `vitest src/lib/unifi/firewall.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | FWRC-01 | — | N/A | unit | `vitest src/lib/unifi/firewall.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | FWRC-02 | T-03-01 | Zod validates policyId and enabled params | unit | `vitest src/lib/unifi/firewall.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | FWRC-01 | T-03-02 | Session verified via verifySession() | integration | `vitest tests/app/api/firewall/route.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | FWRC-04 | T-03-03 | Errors mapped to human-readable messages | integration | `vitest tests/app/api/firewall/route.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | FWRC-01 | — | N/A | unit | `vitest tests/components/firewall/rule-toggle.test.tsx` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 3 | FWRC-03 | — | N/A | unit | `vitest tests/components/firewall/rule-toggle.test.tsx` | ❌ W0 | ⬜ pending |
| 03-03-03 | 03 | 3 | FWRC-04 | — | Toast displays error message | unit | `vitest tests/components/firewall/rule-toggle.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/unifi/firewall.test.ts` — tests for ZBF detection, getFirewallPolicies, updateFirewallPolicy
- [ ] `tests/app/api/firewall/route.test.ts` — tests for GET/PUT handlers, session verification, error mapping
- [ ] `tests/components/firewall/rule-toggle.test.tsx` — tests for optimistic update, rollback, toast display
- [ ] `src/components/ui/switch.tsx` — shadcn Switch component (install via `npx shadcn@latest add switch`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Firewall toggle against live UniFi console | FWRC-02 | Requires real UniFi hardware | 1. Start dev server 2. Login 3. Navigate to /firewall 4. Toggle a rule 5. Verify change in UniFi UI |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending