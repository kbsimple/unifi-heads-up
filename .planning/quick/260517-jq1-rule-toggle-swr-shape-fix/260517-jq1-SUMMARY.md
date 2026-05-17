---
status: complete
---
Fixed SWR optimistic update shape mismatch in rule-toggle.tsx. mutate now passes { policies, timestamp } instead of a raw array. RuleToggleProps updated accordingly. Tests updated and passing. tsc clean.
