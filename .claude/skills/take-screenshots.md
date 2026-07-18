# Skill: take-screenshots

Capture up-to-date screenshots of the app running with mock data and write them to `docs/screenshots/`.
Invoke this skill whenever the UI changes significantly, before updating README.md or other docs.

## Output files

| File | Page |
|------|------|
| `docs/screenshots/01-dashboard.png` | Dashboard — Network Clients table |
| `docs/screenshots/02-device-activity.png` | Dashboard — device traffic chart expanded |
| `docs/screenshots/03-firewall.png` | Firewall — policy toggle list |
| `docs/screenshots/04-insights.png` | Insights — traffic charts |

## Steps

Execute the following steps in order. Stop and report if any step fails.

### 1 — Build the production standalone app

```bash
npm run build && \
  cp -r .next/static .next/standalone/.next/static && \
  cp -r public .next/standalone/public
```

> This produces `.next/standalone/server.js` — the production server used for all screenshot captures.
> Skip this step and jump to step 2 if the caller confirms the build is already fresh (e.g. immediately after a previous run of this skill).

### 2 — Run the screenshot suite

The Playwright e2e config (`e2e/playwright.config.ts`) handles starting and stopping the standalone server with `UNIFI_MOCK=true`, running auth setup, and tearing down. Simply run:

```bash
npx playwright test --config e2e/screenshot.config.ts
```

This will:
- Start the standalone server on port 3001 with mock data
- Authenticate as `admin` / `testpassword` (stored in `e2e/playwright/.auth/user.json`)
- Capture 4 screenshots and write them to `docs/screenshots/`
- Shut down the server

### 3 — Verify output

Check that all four files were written and are non-empty:

```bash
ls -lh docs/screenshots/
```

All four files (`01-dashboard.png` through `04-insights.png`) must be present with sizes > 10 KB.

### 4 — Report

List the updated files and confirm to the caller that screenshots are ready for use.

## Notes

- **Playwright auth credentials** — the e2e config starts the server with `ADMIN_PASSWORD` set to a bcrypt hash of `testpassword`. The auth setup fixture (`e2e/fixtures/auth.setup.ts`) logs in with those credentials. Do not confuse with the dev server credentials in `.env.local` (password: `admin`).
- **Port** — the screenshot server runs on port 3001. If another process is using 3001, kill it first: `lsof -ti:3001 | xargs kill -9`.
- **Viewport** — all screenshots use 1440×900.
- **Mock data** — screenshot content is deterministic (static `MOCK_CLIENTS` in `src/lib/unifi/mock.ts`). Re-running always produces the same visual output for the same codebase.
