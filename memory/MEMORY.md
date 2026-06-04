# Memory Index

- [No confirmation on requested tasks](feedback_no_confirm.md) — Execute tasks immediately when asked; skip "shall I proceed?" prompts
- [Run type check before every commit](feedback_typecheck_before_commit.md) — Run npx tsc --noEmit before committing to catch type errors before they break the Docker build
- [Autonomous mode — skip confirmation on recommended paths](feedback_autonomous_no_confirm.md) — In /gsd-autonomous, auto-proceed on tech_debt audits and "acknowledge all" pre-close; only pause for genuine blockers
- [Test gate before commits](feedback_test_gate.md) — Run full test suite before significant commits; tests must pass for phase completion