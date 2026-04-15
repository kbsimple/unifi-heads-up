---
phase: 1
slug: foundation-authentication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | None yet — Wave 0 installs |
| **Quick run command** | `pnpm test --run` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUTH-01 | T-1-01 | bcrypt password comparison | unit | `pnpm test --run auth.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | AUTH-02 | T-1-02 | JWT with 7-day expiration | unit | `pnpm test --run session.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | AUTH-03 | — | Session cookie deletion | unit | `pnpm test --run logout.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 1 | AUTH-04 | T-1-04 | Middleware redirect | unit | `pnpm test --run middleware.test.ts` | ❌ W0 | ⬜ pending |
| 01-05-01 | 05 | 1 | UIUX-04 | — | Structured error messages | unit | `pnpm test --run error-messages.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration for Next.js 15
- [ ] `tests/setup.ts` — Test environment setup (jsdom, mocks)
- [ ] `tests/auth.test.ts` — Login flow tests (AUTH-01)
- [ ] `tests/session.test.ts` — Session persistence tests (AUTH-02)
- [ ] `tests/logout.test.ts` — Logout functionality tests (AUTH-03)
- [ ] `tests/middleware.test.ts` — Route protection tests (AUTH-04)
- [ ] `tests/error-messages.test.ts` — Error message mapping tests (UIUX-04)
- [ ] Framework install: `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| JWT secret length ≥32 chars | AUTH-02 | Environment variable check | Verify SESSION_SECRET is 64+ hex chars in Vercel |
| Cookie secure flag in production | AUTH-02 | Requires prod deploy | Deploy to Vercel, check Set-Cookie header in browser devtools |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending