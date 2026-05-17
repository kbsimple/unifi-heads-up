---
status: complete
---
Replaced optimistic update with isPending disabled state in rule-toggle.tsx. Switch disables with opacity-50 while fetch is in flight; SWR revalidates on success. data prop removed from RuleToggleProps; callers updated. Tests updated. tsc clean.
