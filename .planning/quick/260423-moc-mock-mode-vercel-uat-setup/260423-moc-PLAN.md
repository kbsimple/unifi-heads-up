---
phase: quick
plan: 260423-moc
type: execute
wave: 1
depends_on: []
files_modified:
  - .env.vercel-mock
  - README.md
autonomous: true
requirements: []

must_haves:
  truths:
    - ".env.vercel-mock exists with real bcrypt hashes and UNIFI_MOCK=true, ready to copy into Vercel"
    - "README explains how to configure a Vercel preview deployment with mock data, step by step"
    - "README variable reference notes that UNIFI_CONSOLE_ID and UNIFI_API_KEY are optional when UNIFI_MOCK=true"
    - ".env.local documents UNIFI_MOCK as an available variable"
  artifacts:
    - path: ".env.vercel-mock"
      provides: "Copy-ready Vercel env file for UAT mock deployment"
      contains: "UNIFI_MOCK=true"
    - path: "README.md"
      provides: "Vercel Preview / UAT (Mock Mode) section"
      contains: "Vercel Preview"
  key_links:
    - from: "README.md Vercel UAT section"
      to: ".env.vercel-mock"
      via: "vercel env pull / manual copy instructions"
      pattern: ".env.vercel-mock"
---

<objective>
Document and enable Vercel preview deployments that run on mock data — no real Unifi console or API key required. Useful for UAT, demos, and PR preview links shared with family users.

Purpose: The mock facade (UNIFI_MOCK=true) already works end-to-end but there is no documented path for deploying it to Vercel, and no ready-made env file to paste into the Vercel dashboard.
Output: `.env.vercel-mock` (copy-ready env file) + README "Vercel Preview / UAT" section.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@README.md
@src/lib/unifi/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create .env.vercel-mock with real bcrypt hashes</name>
  <files>.env.vercel-mock</files>
  <action>
Create `.env.vercel-mock` at the repo root. This file is NOT gitignored — it contains no production secrets, only fixed UAT test credentials clearly labeled as such.

Use exactly these pre-generated values (do NOT regenerate — hashes are already computed and verified):

```
# ============================================================
# UAT / Vercel Preview Environment — MOCK MODE
# ============================================================
# This file is safe to commit. It contains NO production secrets.
# All credentials are fixed UAT test values.
#
# Import into Vercel:
#   vercel env pull .env.vercel-mock --environment preview
# Or paste each variable manually in:
#   Vercel Dashboard -> Project -> Settings -> Environment Variables
#
# WARNING: Do NOT use these values in a production deployment.
# ============================================================

# Mock mode: disables all real UniFi API calls
UNIFI_MOCK=true

# Dummy values — not used when UNIFI_MOCK=true,
# but included so Vercel does not flag them as missing.
UNIFI_CONSOLE_ID=mock-console-id
UNIFI_API_KEY=mock-api-key

# JWT signing key — UAT only, not for production
SESSION_SECRET=uat-only-session-secret-not-for-production-use-32c

# Admin account — password: uat-admin
ADMIN_USER=admin
ADMIN_PASSWORD=$2b$10$cDHm77wudUo2bk0H0Vne9.xYzzEMev8NQStrOluQ66A/6nCfBcfou

# Family account — password: uat-family
FAMILY_USER=family
FAMILY_PASSWORD=$2b$10$fsN9L5i1iYvL0zOswCxkrebL6B/Beg813BPoEYG7huGu6r/xXzTPG
```

Verify the SESSION_SECRET is exactly 50 characters (satisfies the 32+ char requirement).
  </action>
  <verify>
    <automated>node -e "require('fs').readFileSync('.env.vercel-mock','utf8').split('\n').filter(l=>l.startsWith('UNIFI_MOCK')).forEach(l=>console.log(l))"</automated>
  </verify>
  <done>`.env.vercel-mock` exists at repo root, contains UNIFI_MOCK=true, real bcrypt hashes for both users, and dummy values for UNIFI_CONSOLE_ID and UNIFI_API_KEY.</done>
</task>

<task type="auto">
  <name>Task 2: Update README — Vercel UAT section + variable reference + .env.local UNIFI_MOCK</name>
  <files>README.md</files>
  <action>
Make three edits to README.md:

**Edit 1 — Add "Vercel Preview / UAT (Mock Mode)" section**

Insert this new section immediately before the "## Project Structure" section:

```markdown
## Vercel Preview / UAT (Mock Mode)

You can deploy to Vercel using synthetic mock data — no real Unifi console or API key required. This is useful for UAT, PR previews, and sharing a live demo with family members.

### How it works

When `UNIFI_MOCK=true` is set, the UniFi facade (`src/lib/unifi/index.ts`) loads the mock module instead of the real API client. No calls are made to `api.ui.com`, so `UNIFI_CONSOLE_ID` and `UNIFI_API_KEY` are not needed (dummy values are supplied to satisfy Vercel's "missing variable" checks).

### Set up a Vercel preview deployment with mock data

1. Push your branch to GitHub.
2. Open the Vercel dashboard and navigate to your project.
3. Go to **Settings -> Environment Variables**.
4. Add each variable from `.env.vercel-mock` (repo root). You can paste them one by one, or use the Vercel CLI to bulk-import:

   ```bash
   npx vercel env pull   # pulls production vars — do this first if you have them
   npx vercel env add    # interactive add, or use the dashboard
   ```

   Alternatively, copy the contents of `.env.vercel-mock` directly into Vercel's "Paste as bulk" input (available in the Environment Variables UI).

5. Set the target environment to **Preview** (not Production) for all UAT variables.
6. Trigger a deployment (push a commit or click **Redeploy** in the dashboard).

### UAT login credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `uat-admin` |
| Family | `family` | `uat-family` |

These credentials are defined in `.env.vercel-mock` and are safe to share with testers. They are not used in any production deployment.

### What the mock data includes

The mock layer returns a fixed set of simulated network clients with varying traffic levels (high / medium / low / idle) and a set of firewall policies with toggle controls. Firewall toggle state is held in-memory and resets on each server restart / cold start.
```

**Edit 2 — Update the Variable Reference table**

In the existing Variable Reference table, change the `Required` and `How to obtain` cells for `UNIFI_CONSOLE_ID` and `UNIFI_API_KEY`:

- `UNIFI_CONSOLE_ID` Required: change `Yes` to `Yes (not needed when UNIFI_MOCK=true)`
- `UNIFI_CONSOLE_ID` How to obtain: keep existing text, append ` — set to any dummy value when UNIFI_MOCK=true`
- `UNIFI_API_KEY` Required: change `Yes` to `Yes (not needed when UNIFI_MOCK=true)`
- `UNIFI_API_KEY` How to obtain: keep existing text, append ` — set to any dummy value when UNIFI_MOCK=true`

Also add a new row for `UNIFI_MOCK`:

```
| `UNIFI_MOCK` | No | Set to `true` to use mock data (no real API calls) | Defaults to disabled; set in `.env.vercel-mock` for UAT |
```

Insert this row just above the `UNIFI_CONSOLE_ID` row.

**Edit 3 — Add UNIFI_MOCK to the .env.local example block in "Environment Setup"**

In the code block under "Environment Setup" that shows the `.env.local` template, add the following line after the `UNIFI_API_KEY` line:

```
# Mock mode (optional — disables real API calls, use for local dev or UAT)
# UNIFI_MOCK=true
```
  </action>
  <verify>
    <automated>node -e "const s=require('fs').readFileSync('README.md','utf8'); ['Vercel Preview / UAT','UNIFI_MOCK','uat-admin','uat-family','not needed when UNIFI_MOCK'].forEach(t=>{if(!s.includes(t))throw new Error('Missing: '+t)}); console.log('README checks passed')"</automated>
  </verify>
  <done>README.md contains a "Vercel Preview / UAT (Mock Mode)" section with setup steps and credentials table; variable reference table lists UNIFI_MOCK and marks UNIFI_CONSOLE_ID/UNIFI_API_KEY as optional in mock mode; the .env.local template block shows UNIFI_MOCK as a commented optional variable.</done>
</task>

</tasks>

<verification>
After both tasks complete:

1. `.env.vercel-mock` is present at repo root and NOT listed in `.gitignore`
2. `UNIFI_MOCK=true` appears in `.env.vercel-mock`
3. Both bcrypt hashes in `.env.vercel-mock` verify correctly:
   ```bash
   node -e "const b=require('bcryptjs'); console.log(b.compareSync('uat-admin','\$2b\$10\$cDHm77wudUo2bk0H0Vne9.xYzzEMev8NQStrOluQ66A/6nCfBcfou')); console.log(b.compareSync('uat-family','\$2b\$10\$fsN9L5i1iYvL0zOswCxkrebL6B/Beg813BPoEYG7huGu6r/xXzTPG'))"
   ```
   Both must print `true`.
4. README contains "Vercel Preview / UAT (Mock Mode)" section
5. README variable reference table lists UNIFI_MOCK
</verification>

<success_criteria>
- `.env.vercel-mock` exists, committed, contains real bcrypt hashes, UNIFI_MOCK=true, dummy API vars, and is clearly labeled UAT-only
- README has end-to-end instructions a family member can follow to set up a Vercel preview with mock data
- No real secrets are introduced — file is safe to commit
- Hash verification confirms `uat-admin` and `uat-family` passwords resolve correctly
</success_criteria>

<output>
After completion, create `.planning/quick/260423-moc-mock-mode-vercel-uat-setup/260423-moc-SUMMARY.md`
</output>
