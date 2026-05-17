# Phase 1: Foundation & Authentication - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can securely access the dashboard with proper error handling for API failures. This phase delivers: project scaffolding, authentication flow, UniFi API client, and app shell layout. The dashboard content (device list, traffic monitoring) comes in Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Authentication
- **D-01:** Separate dashboard auth — the dashboard has its own credentials stored as environment variables, independent of UniFi credentials
- **D-02:** Credentials stored as env vars (`ADMIN_USER`, `ADMIN_PASSWORD`, `FAMILY_USER`, `FAMILY_PASSWORD`) — zero code for auth, Vercel stores securely
- **D-03:** JWT-based sessions using `jose` library — 7-day session persistence via HTTP-only cookie
- **D-04:** Server-side session validation — use `server-only` package to prevent accidental client imports

### Login Page
- **D-05:** Minimal dark theme — clean form with username/password fields, no logo or branding
- **D-06:** Simple centered card layout — app name at top, form fields below, login button

### Error Handling
- **D-07:** Toast notifications for all user-facing errors — bottom-right position, auto-dismiss after 5 seconds
- **D-08:** Structured error messages — map API error codes to human-readable messages (not generic "API Error")

### App Shell
- **D-09:** Top navigation bar — horizontal bar with app name on left, logout button on right
- **D-10:** Simple layout that accommodates future dashboard content in Phase 2

### Claude's Discretion
- `jose` library for JWT handling (per CLAUDE.md recommendation)
- `ky` HTTP client for UniFi API calls (per CLAUDE.md recommendation)
- `server-only` package for build-time guards (per CLAUDE.md recommendation)
- Custom UniFi client wrapper around `ky` for Site Manager Proxy API calls

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Configuration
- `CLAUDE.md` — Tech stack decisions (Next.js 15, React 19, Tailwind CSS 4, TypeScript 6), authentication approach, deployment target

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-04, UIUX-04 (requirements mapping for this phase)
- `.planning/PROJECT.md` — Core value, constraints, key decisions

### External References
- `https://developer.ui.com/site-manager-api/` — UniFi Site Manager API documentation (for API client implementation)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
None — this is a greenfield project. Phase 1 establishes all foundational patterns.

### Established Patterns
To be established in this phase:
- Server Component patterns (Next.js 15 App Router)
- JWT session handling with HTTP-only cookies
- UniFi API client wrapper with error handling
- Toast notification system

### Integration Points
- Vercel deployment — environment variables for credentials
- UniFi Site Manager Proxy — API client for device/firewall data (Phase 2+)
- Session middleware — protects all authenticated routes

</code_context>

<specifics>
## Specific Ideas

- Login page: minimal, dark theme, centered card with app name and credentials form
- Error toasts: 5-second auto-dismiss, bottom-right, clear actionable messages
- Top nav: app name left-aligned, logout right-aligned, simple and functional
- Credentials: two env var pairs (admin + family), bcrypt hashes for password comparison

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---
*Phase: 01-foundation-authentication*
*Context gathered: 2026-04-14*