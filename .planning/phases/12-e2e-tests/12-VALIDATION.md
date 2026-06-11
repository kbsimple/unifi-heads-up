---
phase: 12
slug: e2e-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-10
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.59.1 (`playwright/test`) + `@playwright/test` 1.60.0 (to install) |
| **Config file** | `e2e/playwright.config.ts` — Wave 0 gap (does not exist yet) |
| **Quick run command** | `npx playwright test e2e/tests/auth.spec.ts --config e2e/playwright.config.ts` |
| **Full suite command** | `npx playwright test --config e2e/playwright.config.ts` |
| **Existing suite** | `npx vitest run` (unit tests — must stay green throughout) |
| **Estimated runtime** | ~3–5 minutes (includes `next build` on first run) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` (unit suite must stay green)
- **After Wave 1 (Playwright setup):** Run `npx playwright test --config e2e/playwright.config.ts` (auth flow only)
- **After Wave 2 (all flow tests):** Run full Playwright suite
- **Before `/gsd-verify-work`:** Both `npx vitest run` AND `npx playwright test` must be green
- **Max feedback latency:** ~180 seconds (first run with build); ~30 seconds (subsequent runs with reuseExistingServer)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | E2E-SETUP | — | N/A | install | `npm ls @playwright/test` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | E2E-AUTH | T-12-01 | Login redirects to /dashboard; no session = redirect to /login | e2e | `npx playwright test e2e/tests/auth.spec.ts --config e2e/playwright.config.ts` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | E2E-HEALTH | — | /api/health returns {ok:true} | smoke | webServer url check in playwright.config.ts | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 2 | E2E-DASH | — | Dashboard renders mock clients with status badges | e2e | `npx playwright test e2e/tests/dashboard.spec.ts --config e2e/playwright.config.ts` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 2 | E2E-FW | T-12-02 | Firewall page renders rules; toggle mutates state | e2e | `npx playwright test e2e/tests/firewall.spec.ts --config e2e/playwright.config.ts` | ❌ W0 | ⬜ pending |
| 12-02-03 | 02 | 2 | E2E-INSIGHTS | — | Insights page loads without error; date range present | e2e | `npx playwright test e2e/tests/insights.spec.ts --config e2e/playwright.config.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All files are Wave 0 gaps — the E2E infrastructure does not exist yet.

- [ ] `npm install -D @playwright/test` — install canonical Playwright test runner
- [ ] `e2e/playwright.config.ts` — webServer config, projects (setup + chromium)
- [ ] `e2e/fixtures/auth.setup.ts` — setup project: login form → storageState
- [ ] `e2e/playwright/.auth/.gitkeep` — directory creation
- [ ] `e2e/tests/auth.spec.ts` — E2E-AUTH stubs
- [ ] `e2e/tests/dashboard.spec.ts` — E2E-DASH stubs
- [ ] `e2e/tests/firewall.spec.ts` — E2E-FW stubs
- [ ] `e2e/tests/insights.spec.ts` — E2E-INSIGHTS stubs
- [ ] Add `test:e2e` script to `package.json`
- [ ] Add `e2e/playwright/.auth/` to `.gitignore`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First-time `npx playwright install chromium` | E2E-SETUP | Binary install requires user intervention on some machines | Run `npx playwright install chromium` and confirm "chromium ... is already installed" or download completes |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s (build-inclusive first run acceptable)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
