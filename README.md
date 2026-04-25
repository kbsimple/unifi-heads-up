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

# Mock mode (optional — disables real API calls, use for local dev or UAT)
# UNIFI_MOCK=true
```

### Variable Reference

| Variable | Required | Purpose | How to obtain |
|---|---|---|---|
| `ADMIN_USER` | Yes | Plaintext username for the admin role | Choose any username (e.g. `admin`) |
| `ADMIN_PASSWORD` | Yes | bcrypt hash of the admin password | See bcrypt command below |
| `FAMILY_USER` | Yes | Plaintext username for the family role | Choose any username (e.g. `family`) |
| `FAMILY_PASSWORD` | Yes | bcrypt hash of the family password | See bcrypt command below |
| `SESSION_SECRET` | Yes | 32+ char secret used to sign JWT session tokens | See openssl command below |
| `UNIFI_MOCK` | No | Set to `true` to use mock data (no real API calls) | Defaults to disabled; set in `.env.vercel-mock` for UAT |
| `UNIFI_CONSOLE_ID` | Yes (not needed when UNIFI_MOCK=true) | Unifi OS console identifier | Unifi Site Manager -> your console -> Settings -> API — set to any dummy value when UNIFI_MOCK=true |
| `UNIFI_API_KEY` | Yes (not needed when UNIFI_MOCK=true) | Site Manager API key (MFA-exempt) | Unifi Site Manager -> Settings -> API -> Create API Key — set to any dummy value when UNIFI_MOCK=true |

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

## API Research

For detailed findings on what the UniFi cloud REST API actually exposes — including what works, what doesn't, and the architectural implications for per-device traffic monitoring — see [docs/UNIFI-API-FINDINGS.md](docs/UNIFI-API-FINDINGS.md).

## Troubleshooting

**"Invalid credentials" on login**
Password env vars must be bcrypt hashes, not plaintext. Re-run the `bcryptjs.hashSync` command and update `.env.local`.

**"SESSION_SECRET must be set" error**
Ensure `.env.local` exists at the repo root and that `SESSION_SECRET` is at least 32 characters. Restart the dev server after editing `.env.local`.

**401 errors from Unifi API calls**
Verify that `UNIFI_API_KEY` is still valid in Unifi Site Manager and that `UNIFI_CONSOLE_ID` matches the target console exactly (no trailing spaces).

**Hot reload not picking up `.env.local` changes**
Environment files are read at startup. Stop and restart `npm run dev` after any `.env.local` edit.

---

## Self-Hosted / Docker

Run the dashboard as a permanent container on a computer that stays on your home network (a Mac mini, NAS, or any always-on machine). Once running, anyone on the network can open the app in a browser without the host machine running a dev server.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- The repository cloned locally (see [Installation](#installation))

### 1. Copy the env template

```bash
cp .env.prod.example .env.prod
```

Open `.env.prod` and fill in every value. The file is gitignored — your secrets will not be committed.

| Variable | What to put | How to get it |
|---|---|---|
| `UNIFI_HOST` | LAN IP or hostname of your UniFi console (e.g. `192.168.1.1`) | Your router's admin page, or UniFi OS settings |
| `UNIFI_API_KEY` | API key from your UniFi console | UniFi OS → Settings → API → Create API Key |
| `ADMIN_USER` | Username for the admin account | Choose any (e.g. `admin`) |
| `ADMIN_PASSWORD` | bcrypt hash of the admin password | See command below |
| `FAMILY_USER` | Username for the family account | Choose any (e.g. `family`) |
| `FAMILY_PASSWORD` | bcrypt hash of the family password | See command below |
| `SESSION_SECRET` | 32+ character random string | See command below |
| `PORT` | Port to expose the app on (default: `3000`) | Leave as `3000` unless port 3000 is taken |

**Generate a bcrypt password hash:**
```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

**Generate SESSION_SECRET:**
```bash
openssl rand -hex 32
```

### 2. Build and start the container

```bash
docker compose up -d --build
```

This builds the image and starts the container in the background. The first build takes a few minutes. Subsequent starts are instant.

### 3. Open the app

Open a browser on any device on the same network and go to:

```
http://<host-machine-ip>:3000
```

Replace `<host-machine-ip>` with the LAN IP of the computer running Docker (not your UniFi console IP). Log in with the username and plaintext password you set in `.env.prod`.

### Updating

When you pull new code, rebuild the image:

```bash
git pull
docker compose up -d --build
```

### Stopping

```bash
docker compose down
```

The container restarts automatically if the host machine reboots (`restart: unless-stopped` in `docker-compose.yml`). To prevent that, run `docker compose down` before rebooting.

### Troubleshooting Docker

**Container starts but app is not reachable from another device**
This usually means the host machine's firewall is blocking port 3000. On macOS, Docker Desktop handles this automatically. On Linux, you may need to allow port 3000: `sudo ufw allow 3000`.

**"permission denied" errors in docker logs**
The container runs as the `node` user (non-root). If you see permission errors on mounted volumes, check that the volume path is accessible.

**Container shows as unhealthy**
The healthcheck pings `/api/health` every 30 seconds. If the app takes more than 10 seconds to start (slow hardware), it may briefly show as `starting`. Run `docker compose logs app` to see startup output.
