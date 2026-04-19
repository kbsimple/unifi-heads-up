---
phase: quick-260418-ocd
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - README.md
autonomous: true
requirements:
  - DOCS-README

must_haves:
  truths:
    - "A new contributor can clone the repo, follow README setup, and reach a running dev server at http://localhost:3000"
    - "README clearly identifies the project as the Unifi Network Dashboard (not generic create-next-app boilerplate)"
    - "README documents every required environment variable (auth credentials, SESSION_SECRET, UNIFI_CONSOLE_ID, UNIFI_API_KEY) with how to obtain/generate each"
    - "README documents how to run tests (vitest) including watch and run-once modes"
    - "README documents the build, lint, and production-start commands"
    - "README mentions Vercel as the deployment target and notes Site Manager Proxy connectivity"
  artifacts:
    - path: "README.md"
      provides: "Project overview, prerequisites, env var setup, dev/test/build/deploy instructions"
      contains: "Unifi Network Dashboard"
      min_lines: 80
  key_links:
    - from: "README.md Environment Variables section"
      to: ".env.local"
      via: "documented variable names matching code (ADMIN_USER, ADMIN_PASSWORD, FAMILY_USER, FAMILY_PASSWORD, SESSION_SECRET, UNIFI_CONSOLE_ID, UNIFI_API_KEY)"
      pattern: "ADMIN_USER|SESSION_SECRET|UNIFI_API_KEY"
    - from: "README.md Testing section"
      to: "package.json scripts"
      via: "documented commands match scripts (npm test, npm run test:run)"
      pattern: "npm (run )?test"
---

<objective>
Replace the stock create-next-app README with a comprehensive, project-specific README for the Unifi Network Dashboard. The new README must let a new contributor (or the user returning months later) get the app running locally, run the test suite, build for production, and understand deployment, without consulting any other file.

Purpose: The current README.md is unmodified Next.js boilerplate. It does not mention this is the Unifi Network Dashboard, does not document the required environment variables (auth credentials, JWT secret, UniFi Site Manager API key), does not document the test commands, and does not describe the deployment model (Vercel + Site Manager Proxy). This makes onboarding impossible without reading CLAUDE.md and source code.

Output: A rewritten README.md (~100-150 lines) covering: project overview, tech stack, prerequisites, install, environment setup, dev server, testing, build/production, deployment, and project structure pointers.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md
@README.md
@package.json
@vitest.config.ts

<interfaces>
<!-- Key facts the executor needs. Extracted from codebase. -->

From package.json scripts:
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest",
  "test:run": "vitest --run"
}
```

From src/lib/session.ts and src/app/actions/auth.ts — required env vars:
- ADMIN_USER (plaintext username for admin role)
- ADMIN_PASSWORD (bcrypt hash, NOT plaintext)
- FAMILY_USER (plaintext username for family role)
- FAMILY_PASSWORD (bcrypt hash, NOT plaintext)
- SESSION_SECRET (32+ chars, used by jose for JWT HS256 signing)

From src/lib/unifi/client.ts — required env vars:
- UNIFI_CONSOLE_ID (Unifi OS console identifier from Site Manager)
- UNIFI_API_KEY (Site Manager API key, MFA-exempt)

From CLAUDE.md tech stack:
- Next.js 16.x, React 19, TypeScript 5.x, Tailwind 4
- Vercel deployment
- Site Manager Proxy connectivity (no VPN, no direct controller access)
- Node 18.18+ required by Next.js

From .planning/PROJECT.md — core value:
"Visibility and control over home network traffic. If everything else fails, users must be able to see which devices are actively using bandwidth and pause/resume internet access for specific devices or groups."
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite README.md with comprehensive project, setup, and operations docs</name>
  <files>README.md</files>
  <action>
    Replace the entire current README.md (currently the stock create-next-app boilerplate) with a project-specific README structured as the sections below. Use markdown headings (`#`, `##`, `###`), fenced code blocks for all commands, and tables where they clarify (e.g., env var reference).

    Required sections in this order:

    1. **Title + one-line tagline** — "# Unifi Network Dashboard" + the Core Value sentence from PROJECT.md.

    2. **Overview** — 2-4 sentences describing what the app does (monitors home network traffic by device/group, toggles existing firewall rules), who it is for (family household), and how it connects (Site Manager Proxy via api.ui.com — no VPN required).

    3. **Tech Stack** — Bulleted list: Next.js 16 (App Router, Server Components), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, jose (JWT auth), bcryptjs, ky (HTTP client), Recharts (traffic charts), Vitest (testing), Vercel (deployment).

    4. **Prerequisites** — Node 18.18+, npm, a Unifi OS console, a Site Manager API key (MFA-exempt), and `openssl` for generating SESSION_SECRET. Include the exact `node --version` check command.

    5. **Installation** — Two fenced-code steps:
       ```
       git clone <repo-url>
       cd unifi-api
       npm install
       ```

    6. **Environment Setup** — Critical section. Explain that `.env.local` is required (gitignored). Provide a copy-pasteable template block matching the actual variables found in code:
       ```
       # Authentication (use bcrypt hashes for passwords, NOT plaintext)
       ADMIN_USER=admin
       ADMIN_PASSWORD=$2a$10$...   # bcrypt hash
       FAMILY_USER=family
       FAMILY_PASSWORD=$2a$10$...  # bcrypt hash

       # JWT signing key (32+ chars; generate with: openssl rand -hex 32)
       SESSION_SECRET=<generated-secret>

       # Unifi Site Manager Proxy
       UNIFI_CONSOLE_ID=<your-console-id>
       UNIFI_API_KEY=<your-api-key>
       ```
       Then a reference table with columns: Variable | Required | Purpose | How to obtain. Include the bcrypt hash generation command:
       ```
       node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
       ```
       And the SESSION_SECRET generation command:
       ```
       openssl rand -hex 32
       ```
       For UNIFI_CONSOLE_ID and UNIFI_API_KEY, point to the Unifi Site Manager dashboard at https://unifi.ui.com (Settings → API).

    7. **Running the App (Development)** — Fenced code block:
       ```
       npm run dev
       ```
       Then: open http://localhost:3000, log in with the credentials configured in `.env.local` (use the plaintext password that corresponds to the bcrypt hash).

    8. **Testing** — Document both modes:
       ```
       npm test          # watch mode (vitest)
       npm run test:run  # single run, CI-style
       ```
       Note: tests use jsdom + a baked-in test SESSION_SECRET (see `vitest.config.ts`), so no `.env.local` is needed to run tests. Mention that test files live in `tests/` and follow `*.test.ts(x)` naming.

    9. **Linting & Type Checking** —
       ```
       npm run lint
       npx tsc --noEmit   # type-check without emitting
       ```

    10. **Production Build** —
        ```
        npm run build
        npm start
        ```
        Note that `npm start` requires `npm run build` first.

    11. **Deployment (Vercel)** — Brief: push to git, import in Vercel, add the same environment variables from the Environment Setup section to the Vercel project settings (Production + Preview environments). Mention that Site Manager Proxy works from Vercel because it is a public HTTPS endpoint (api.ui.com) — no VPN or self-hosting needed.

    12. **Project Structure** — Compact tree showing the top level only:
        ```
        src/
          app/          # Next.js App Router (routes, layouts, server actions)
            (auth)/     # Login route group
            (dashboard)/# Protected dashboard route group
            actions/    # Server Actions (auth, etc.)
            api/        # API routes
          components/   # React components (shadcn/ui + custom)
          lib/
            unifi/      # Site Manager Proxy client
            session.ts  # JWT session helpers (jose)
            dal.ts      # Data access layer
        tests/          # Vitest test suite
        .planning/      # GSD workflow artifacts (phases, state)
        ```

    13. **Troubleshooting** — Short list of common issues:
        - "Invalid credentials" on login → password env vars must be bcrypt hashes, not plaintext.
        - "SESSION_SECRET must be set" → ensure `.env.local` exists and is at least 32 chars.
        - 401 from UniFi calls → verify `UNIFI_API_KEY` is valid in Site Manager and `UNIFI_CONSOLE_ID` matches your console.
        - Hot reload not picking up `.env.local` changes → restart `npm run dev` (env files are read at startup).

    Constraints / things to avoid:
    - Do NOT keep any of the original create-next-app boilerplate text.
    - Do NOT invent env vars not actually used by the code (only those listed in the interfaces block).
    - Do NOT include real secrets, only placeholder values.
    - Do NOT add a license section (out of scope; user has not specified one).
    - Do NOT add badges, logos, or screenshots — keep it text-only and functional.
    - Use plain markdown only (no HTML, no emojis).
  </action>
  <verify>
    <automated>test -f README.md && grep -q "Unifi Network Dashboard" README.md && grep -q "ADMIN_PASSWORD" README.md && grep -q "SESSION_SECRET" README.md && grep -q "UNIFI_CONSOLE_ID" README.md && grep -q "UNIFI_API_KEY" README.md && grep -q "npm run dev" README.md && grep -q "npm test" README.md && grep -q "npm run build" README.md && grep -q "Vercel" README.md && [ "$(wc -l &lt; README.md)" -ge 80 ] && ! grep -q "bootstrapped with" README.md</automated>
  </verify>
  <done>
    README.md is a comprehensive, project-specific document for the Unifi Network Dashboard covering: overview, tech stack, prerequisites, install, env setup (with all 7 required variables), dev server, testing, lint/type-check, production build, Vercel deployment, project structure, and troubleshooting. No create-next-app boilerplate text remains. File is ≥80 lines.
  </done>
</task>

</tasks>

<verification>
- README.md contains the project name "Unifi Network Dashboard" (not generic Next.js boilerplate).
- README.md documents all 7 required env vars by exact name: ADMIN_USER, ADMIN_PASSWORD, FAMILY_USER, FAMILY_PASSWORD, SESSION_SECRET, UNIFI_CONSOLE_ID, UNIFI_API_KEY.
- README.md documents these commands: `npm install`, `npm run dev`, `npm test`, `npm run test:run`, `npm run lint`, `npm run build`, `npm start`.
- README.md mentions Vercel deployment and Site Manager Proxy connectivity.
- Original create-next-app phrase "bootstrapped with" no longer appears.
- File is at least 80 lines (covers all required sections in reasonable depth).
</verification>

<success_criteria>
A new contributor (or the user 6 months from now) can:
1. Clone the repo and follow the README to install dependencies.
2. Generate a SESSION_SECRET and bcrypt password hashes from the README's commands.
3. Populate `.env.local` from the README's template.
4. Start the dev server and log in.
5. Run the test suite.
6. Build and deploy to Vercel.

…all without reading any other file in the repository.
</success_criteria>

<output>
After completion, create `.planning/quick/260418-ocd-update-readme-with-comprehensive-instruc/260418-ocd-SUMMARY.md` summarizing what changed in README.md and confirming all required sections and env vars are present.
</output>
