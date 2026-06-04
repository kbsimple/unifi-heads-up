---
name: test-gate-before-commits
description: Run full test suite before significant commits; tests must pass for phase completion
metadata:
  type: feedback
---

**Test Gating Requirement**

Before any significant commit (especially phase completions, feature merges, or test file updates):

1. **Run full test suite:** `npx vitest run` — all tests must pass
2. **Type check:** `npx tsc --noEmit` — must complete without errors (pre-existing errors in unchanged files are acceptable)
3. **Verify test changes don't break existing tests** — if fixing tests, run full suite to confirm no regressions

**Phase Completion Criteria:**

A phase is NOT complete until:
- [ ] All tests pass (`npx vitest run` exits with 0 failures)
- [ ] No new TypeScript errors introduced
- [ ] Commit includes any necessary test updates

**Why:** Tests are the safety net that catches regressions. A phase with failing tests is incomplete work — the implementation may be correct, but if tests fail, the phase cannot be trusted to work in production.

**How to apply:**
- During `/gsd-execute-phase`: Run `npx vitest run` after implementation, before declaring completion
- During `/gsd-quick`: Run tests as part of the final verification step
- If tests fail: Fix them as part of the current task, not as follow-up work

**Related:** [[feedback_typecheck_before_commit]] — type check before every commit