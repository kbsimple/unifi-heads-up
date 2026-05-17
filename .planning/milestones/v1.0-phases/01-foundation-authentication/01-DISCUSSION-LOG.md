# Phase 1: Foundation & Authentication - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 01-foundation-authentication
**Areas discussed:** Auth model, Credentials, Login page UX, Error presentation, App shell layout

---

## Auth Model

| Option | Description | Selected |
|--------|-------------|----------|
| Separate dashboard auth | Dashboard has its own credentials (env vars). UniFi API calls use separate API key. Users never touch UniFi credentials. | ✓ |
| UniFi credential proxy | Users log in with UniFi admin credentials, dashboard proxies to controller. Tightly coupled, CSRF complexity. | |
| Single shared family password | One password for the whole family. Simplest, but no individual sessions. | |

**User's choice:** Separate dashboard auth (Recommended)
**Notes:** Cleanest separation, simplest to maintain. Dashboard auth is independent of UniFi credentials.

---

## Credentials Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Env vars | One admin user and one family password as NEXT_PUBLIC_ADMIN_USER/PASSWORD env vars. Simple, works for family use case. | ✓ |
| Config file | A local users.json file with bcrypt hashes. More flexible but requires redeploy to change passwords. | |

**User's choice:** Env vars (Recommended)
**Notes:** Zero code for auth, Vercel stores securely. Pragmatic for 2-4 family members.

---

## Login Page UX

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal dark | Clean, dark-themed form with app name. No logo, no branding. Just inputs and a button. | ✓ |
| Network/UniFi themed | UniFi-themed with blue accent colors, possibly a network icon. | |
| Branded with logo | A logo, app name, and tagline. More product-like. | |

**User's choice:** Minimal dark (Recommended)
**Notes:** Focus on function, not flash. Clean and simple.

---

## Error Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Toast notifications | Small toast bottom-right, auto-dismisses after 5 seconds. Non-intrusive. | ✓ |
| Inline banners | Banner at top of page that stays until dismissed. Good for persistent issues. | |
| Full-page error states | Full-screen error page with details. Overkill for minor issues. | |

**User's choice:** Toast notifications (Recommended)
**Notes:** Keeps focus on dashboard content, non-intrusive for transient errors.

---

## App Shell Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Top navigation | Horizontal bar at top with app name and logout button. Simple, familiar, full width for content. | ✓ |
| Sidebar navigation | Vertical bar on left with nav items. Good for many sections, overkill here. | |
| You decide | Planner decides based on best practices. | |

**User's choice:** Top navigation (Recommended)
**Notes:** Works well for focused dashboard with single primary view. Sets pattern for Phase 2.

---

## Claude's Discretion

- JWT implementation: `jose` library (per CLAUDE.md recommendation)
- HTTP client: `ky` for UniFi API calls (per CLAUDE.md recommendation)
- Session handling: HTTP-only cookies, 7-day expiry
- Build guards: `server-only` package to prevent client imports of server code
- API client: Custom wrapper around `ky` for Site Manager Proxy

## Deferred Ideas

None — discussion stayed within phase scope.