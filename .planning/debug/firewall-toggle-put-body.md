---
slug: firewall-toggle-put-body
status: resolved
trigger: PUT /api/firewall toggle fails silently — updateFirewallPolicy sends only { enabled } in the body but UniFi PUT /firewall-policies/{id} likely requires the full policy object
created: 2026-05-17
updated: 2026-05-17
---

## Symptoms

- **Expected:** Toggling a firewall rule switch enables/disables the rule on the UniFi controller and the switch stays in its new state
- **Actual:** Toggle optimistically flips, API call fails, SWR rolls back, toast shows "Unable to update firewall rule. Changes reverted automatically."
- **Errors:** No HTTP status code captured — error message swallowed at `throw new Error(\`UniFi API error: ${response.status} ${response.statusText}\`)`
- **Timeline:** Unknown if it ever worked
- **Reproduction:** Click any firewall rule toggle switch in the firewall list UI

## Current Focus

hypothesis: CONFIRMED — updateFirewallPolicy sent only { enabled } in PUT body; UniFi PUT /firewall-policies/{id} uses full-replacement semantics and rejects partial bodies
test: N/A — root cause confirmed via code inspection + API semantics
expecting: N/A
next_action: RESOLVED

## Evidence

- timestamp: 2026-05-17
  checked: src/lib/unifi/client.ts updateFirewallPolicy (line 267)
  found: body: JSON.stringify({ enabled }) — only sends { enabled }, no other fields
  implication: UniFi PUT endpoint (full-replacement REST semantics) receives an incomplete object; likely responds with 4xx; error is thrown but body is never logged

- timestamp: 2026-05-17
  checked: src/lib/unifi/types.ts FirewallPolicySchema
  found: Schema only captures _id, name, enabled — Zod strips all other fields by default (no .passthrough())
  implication: Even if GET response were used, the parsed result would be missing fields like action, source, destination, zones — meaning a GET-then-PUT using the parsed schema would still send an incomplete body

- timestamp: 2026-05-17
  checked: .planning/phases/03-firewall-control/03-RESEARCH.md D-13
  found: "Toggle via PUT request to /firewall-policies/{policy_id} with enabled: true|false body" — planning doc described partial body, but UniFi REST PUT conventions require full replacement
  implication: The design decision in D-13 was incorrect; partial PATCH is not available on this endpoint

- timestamp: 2026-05-17
  checked: error throw at client.ts line 289
  found: throw new Error(`UniFi API error: ${response.status} ${response.statusText}`) — response body never read
  implication: Future failures produce no diagnostic information about what the API actually rejected

## Eliminated Hypotheses

- hypothesis: Network/connectivity failure
  evidence: SWR rolls back cleanly, which means the PUT request completes (gets a response); a network failure would produce a different error path
  timestamp: 2026-05-17

## Resolution

root_cause: updateFirewallPolicy sends only { enabled } in the PUT body. UniFi's PUT /firewall-policies/{id} endpoint uses full-replacement semantics (standard REST PUT) and rejects partial bodies with a 4xx. The error was silently swallowed because the throw discarded the response body, leaving no diagnostic information.

fix: >
  1. GET the current full policy object from /firewall-policies/{id} before PUT.
  2. Spread the full raw JSON (not the Zod-parsed minimal schema, which strips fields) and merge enabled.
  3. PUT the complete merged object.
  4. Improved error logging: both GET and PUT failure paths now capture and include response.text() in the thrown error message.

verification: >
  - 39 tests pass across firewall.test.ts, mock.test.ts, route.test.ts
  - New tests confirm GET-then-PUT sequence and that the full object (not just { enabled }) is sent in the PUT body
  - New tests confirm error messages include HTTP status + response body text
  - npx tsc --noEmit: no new type errors introduced (pre-existing undici Response type mismatch in test suite unchanged)

files_changed:
  - src/lib/unifi/client.ts
  - tests/lib/unifi/firewall.test.ts
