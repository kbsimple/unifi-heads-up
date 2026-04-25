---
phase: 6
slug: local-api-client
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/lib/unifi/client.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/lib/unifi/client.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | LOCAL-02 | T-6-01 | undici Agent with rejectUnauthorized:false scoped to console requests only — never global | unit | `npx vitest run tests/lib/unifi/client.test.ts` | ✅ W0 | ⬜ pending |
| 6-01-02 | 01 | 1 | LOCAL-01 | — | X-API-KEY sent in header, not query param or body | unit | `npx vitest run tests/lib/unifi/client.test.ts` | ✅ W0 | ⬜ pending |
| 6-01-03 | 01 | 1 | LOCAL-01 | — | UNIFI_HOST and UNIFI_API_KEY env vars validated; descriptive error thrown if absent | unit | `npx vitest run tests/lib/unifi/client.test.ts` | ✅ W0 | ⬜ pending |
| 6-01-04 | 01 | 1 | LOCAL-04 | — | updateFirewallPolicy sends PUT with JSON body and returns FirewallPolicy | unit | `npx vitest run tests/lib/unifi/client.test.ts` | ✅ W0 | ⬜ pending |
| 6-01-05 | 01 | 1 | LOCAL-05 | — | UNIFI_MOCK=true routes to mock; real client not called | unit | `npx vitest run tests/lib/unifi/index.test.ts` | ✅ | ⬜ pending |
| 6-02-01 | 02 | 1 | LOCAL-03 | — | Full suite passes with LOCAL-01..05 all green | integration | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/unifi/client.test.ts` — update mock from `vi.mock('ky', ...)` to `vi.mock('undici', ...)` with fetch and Agent mocks

*All test infrastructure (vitest, RTL) already exists. Wave 0 is only a mock update — no new test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App authenticates to real console LAN IP and returns client data | LOCAL-01 | Requires live UniFi hardware on LAN | Set UNIFI_HOST and UNIFI_API_KEY, start app, observe traffic dashboard shows real devices |
| Self-signed cert handled transparently | LOCAL-02 | Requires live console with self-signed cert | Same as above — no TLS error in server logs |
| Firewall toggle reflected in UniFi OS admin UI | LOCAL-04 | Requires live console + visual inspection in UI | Toggle a rule in the app, open UniFi OS admin, verify rule state matches |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
