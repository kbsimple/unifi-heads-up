# Unifi Network Dashboard

Visibility and control over home network traffic. See which devices are actively using bandwidth and pause or resume internet access for specific devices or groups.

## Overview

Unifi Network Dashboard is a personal web application for monitoring home network traffic and managing firewall rules on a Unifi OS console. It shows at-a-glance bandwidth status (high / medium / low / idle) per device and device group, and exposes simple toggle controls for pre-existing firewall rules.

Built for a family household. Connects to the Unifi Site Manager Proxy at `api.ui.com` — no VPN and no direct controller access required.

## Tech Stack

- Next.js 16 (App Router, Server Components)
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui (copy-paste component library)
- jose (JWT session signing, HS256)
- bcryptjs (password hashing)
- ky (HTTP client for Site Manager API)
- Recharts (traffic charts)
- Vitest (unit and integration tests)
- Vercel (deployment target)

## Prerequisites

- Node 18.18 or later (`node --version` to check)
- npm (bundled with Node)
- A Unifi OS console registered in Unifi Site Manager
- A Site Manager API key (must be MFA-exempt; create one at https://unifi.ui.com under Settings -> API)
- `openssl` available in your shell (for generating SESSION_SECRET)

## Installation

```bash
git clone <repo-url>
cd unifi-api
npm install
```

## Environment Setup

The app reads secrets from a `.env.local` file at the repo root. This file is gitignored and must be created manually before the first run.

Create `.env.local` and populate every variable:

```bash
# Authentication (passwords MUST be bcrypt hashes, NOT plaintext)
ADMIN_USER=admin
ADMIN_PASSWORD=$2a$10$...   # bcrypt hash of the admin password

FAMILY_USER=family
FAMILY_PASSWORD=$2a$10$...  # bcrypt hash of the family password

# JWT signing key — must be 32+ characters
SESSION_SECRET=<generated-secret>

# Unifi Site Manager Proxy
UNIFI_CONSOLE_ID=<your-console-id>
UNIFI_API_KEY=<your-api-key>
```

### Variable Reference

| Variable | Required | Purpose | How to obtain |
|---|---|---|---|
| `ADMIN_USER` | Yes | Plaintext username for the admin role | Choose any username (e.g. `admin`) |
| `ADMIN_PASSWORD` | Yes | bcrypt hash of the admin password | See bcrypt command below |
| `FAMILY_USER` | Yes | Plaintext username for the family role | Choose any username (e.g. `family`) |
| `FAMILY_PASSWORD` | Yes | bcrypt hash of the family password | See bcrypt command below |
| `SESSION_SECRET` | Yes | 32+ char secret used to sign JWT session tokens | See openssl command below |
| `UNIFI_CONSOLE_ID` | Yes | Unifi OS console identifier | Unifi Site Manager -> your console -> Settings -> API |
| `UNIFI_API_KEY` | Yes | Site Manager API key (MFA-exempt) | Unifi Site Manager -> Settings -> API -> Create API Key |

### Generate a bcrypt password hash

```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

Paste the printed hash (starts with `$2a$10$...`) as the value for `ADMIN_PASSWORD` or `FAMILY_PASSWORD`.

### Generate SESSION_SECRET

```bash
openssl rand -hex 32
```

Copy the output and set it as `SESSION_SECRET`.

## Running the App (Development)

```bash
npm run dev
```

Open http://localhost:3000 in a browser. Log in with the username from `ADMIN_USER` or `FAMILY_USER` and the **plaintext** password that corresponds to the bcrypt hash you stored (i.e. the password you hashed, not the hash itself).

## Testing

The test suite uses Vitest with a jsdom environment. A baked-in test `SESSION_SECRET` is set in `vitest.config.ts`, so `.env.local` is not required to run tests.

```bash
npm test            # watch mode — reruns tests on file changes
npm run test:run    # single run, exits with pass/fail (CI-style)
```

Test files live in `tests/` and follow the `*.test.ts` / `*.test.tsx` naming convention.

## Linting and Type Checking

```bash
npm run lint        # ESLint
npx tsc --noEmit    # TypeScript type check without emitting files
```

## Production Build

```bash
npm run build
npm start
```

`npm start` requires a completed build. Run `npm run build` first every time production code changes.

## Deployment (Vercel)

1. Push the repository to GitHub (or any Git provider Vercel supports).
2. Import the project in the Vercel dashboard (https://vercel.com/new).
3. Add all variables from the Environment Setup section to the Vercel project's Environment Variables settings for both Production and Preview environments.
4. Deploy.

Site Manager Proxy connectivity works from Vercel without any VPN or self-hosted infrastructure because the proxy endpoint (`api.ui.com`) is a public HTTPS service.

## Project Structure

```
src/
  app/              # Next.js App Router (routes, layouts, server actions)
    (auth)/         # Login route group
    (dashboard)/    # Protected dashboard route group
    actions/        # Server Actions (auth, etc.)
    api/            # API routes
  components/       # React components (shadcn/ui + custom)
  lib/
    unifi/          # Site Manager Proxy client
    session.ts      # JWT session helpers (jose)
    dal.ts          # Data access layer
tests/              # Vitest test suite
.planning/          # GSD workflow artifacts (phases, state)
```

## Troubleshooting

**"Invalid credentials" on login**
Password env vars must be bcrypt hashes, not plaintext. Re-run the `bcryptjs.hashSync` command and update `.env.local`.

**"SESSION_SECRET must be set" error**
Ensure `.env.local` exists at the repo root and that `SESSION_SECRET` is at least 32 characters. Restart the dev server after editing `.env.local`.

**401 errors from Unifi API calls**
Verify that `UNIFI_API_KEY` is still valid in Unifi Site Manager and that `UNIFI_CONSOLE_ID` matches the target console exactly (no trailing spaces).

**Hot reload not picking up `.env.local` changes**
Environment files are read at startup. Stop and restart `npm run dev` after any `.env.local` edit.
