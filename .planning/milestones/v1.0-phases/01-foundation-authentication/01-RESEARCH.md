# Phase 1: Foundation & Authentication - Research

**Researched:** 2026-04-14
**Domain:** Next.js 15 Authentication, JWT Sessions, Server Actions
**Confidence:** HIGH

## Summary

This phase establishes the foundational authentication system for the Unifi Network Dashboard. The implementation uses Next.js 15 Server Actions with jose library for JWT-based sessions stored in HTTP-only cookies. The pattern follows the official Next.js authentication guide with stateless sessions, middleware route protection, and a Data Access Layer (DAL) for server-side authorization checks.

**Primary recommendation:** Use the official Next.js 15 authentication patterns with jose for JWT signing/verification, bcryptjs for password hashing, and sonner for toast notifications.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Separate dashboard auth — the dashboard has its own credentials stored as environment variables, independent of UniFi credentials
- **D-02:** Credentials stored as env vars (`ADMIN_USER`, `ADMIN_PASSWORD`, `FAMILY_USER`, `FAMILY_PASSWORD`) — zero code for auth, Vercel stores securely
- **D-03:** JWT-based sessions using `jose` library — 7-day session persistence via HTTP-only cookie
- **D-04:** Server-side session validation — use `server-only` package to prevent accidental client imports
- **D-05:** Minimal dark theme — clean form with username/password fields, no logo or branding
- **D-06:** Simple centered card layout — app name at top, form fields below, login button
- **D-07:** Toast notifications for all user-facing errors — bottom-right position, auto-dismiss after 5 seconds
- **D-08:** Structured error messages — map API error codes to human-readable messages (not generic "API Error")
- **D-09:** Top navigation bar — horizontal bar with app name on left, logout button on right
- **D-10:** Simple layout that accommodates future dashboard content in Phase 2

### Claude's Discretion
- `jose` library for JWT handling (per CLAUDE.md recommendation)
- `ky` HTTP client for UniFi API calls (per CLAUDE.md recommendation)
- `server-only` package for build-time guards (per CLAUDE.md recommendation)
- Custom UniFi client wrapper around `ky` for Site Manager Proxy API calls

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can log in with username and password | Server Actions pattern with Zod validation, bcryptjs password comparison, session creation |
| AUTH-02 | User session persists across browser refreshes (7-day JWT) | jose SignJWT with 7-day expiration, HTTP-only cookie with expiresAt |
| AUTH-03 | User can log out from any page | Server Action to delete session cookie, form action in nav bar |
| AUTH-04 | Unauthenticated users are redirected to login page | Middleware with protected routes list, redirect to /login |
| UIUX-04 | Dashboard displays meaningful error messages | sonner toast library with error variants, structured error mapping |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Next.js** | 15.x | Full-stack framework | App Router mature, Server Components, Server Actions for mutations [VERIFIED: npm registry] |
| **React** | 19.2.5 | UI library | Required by Next.js 15, Server Components default [VERIFIED: npm registry] |
| **TypeScript** | 6.0.2 | Type safety | Latest stable, critical for auth type safety [VERIFIED: npm registry] |
| **jose** | 6.2.2 | JWT handling | Edge Runtime compatible, tree-shakeable, standard for JWT in Next.js [VERIFIED: npm registry] |
| **bcryptjs** | 3.0.3 | Password hashing | Pure JS, works in Vercel serverless, 10 rounds standard [VERIFIED: npm registry] |
| **server-only** | latest | Build-time guard | Prevents client imports of server code [CITED: Next.js docs] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **zod** | 4.3.6 | Schema validation | Server Actions input validation, type inference [VERIFIED: npm registry] |
| **sonner** | via shadcn | Toast notifications | Error feedback, bottom-right position, 5s auto-dismiss [CITED: shadcn docs] |
| **ky** | 2.0.1 | HTTP client | UniFi API calls (Phase 1+: scaffold only) [VERIFIED: npm registry] |

### shadcn/ui Components
| Component | Purpose | Install Command |
|-----------|---------|-----------------|
| Card | Login page container | `pnpm dlx shadcn@latest add card` |
| Button | Login button, logout button | `pnpm dlx shadcn@latest add button` |
| Sonner | Toast notifications | `pnpm dlx shadcn@latest add sonner` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jose | jsonwebtoken | jsonwebtoken is Node.js only, jose works in Edge Runtime |
| bcryptjs | bcrypt | bcrypt requires native compilation, bcryptjs is pure JS |
| sonner | react-hot-toast | sonner is shadcn-native, simpler API |
| Custom JWT | Auth.js v5 | Auth.js adds OAuth/MFA complexity not needed for family app |

**Installation:**
```bash
# Core dependencies
npm install jose bcryptjs server-only zod ky

# shadcn/ui components
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add card button sonner
```

**Version verification (2026-04-14):**
- next: 16.2.3 available but CLAUDE.md specifies 15.x for stability
- react: 19.2.5 ✓
- typescript: 6.0.2 ✓
- jose: 6.2.2 ✓
- bcryptjs: 3.0.3 ✓
- zod: 4.3.6 ✓
- ky: 2.0.1 ✓

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/              # Route group for auth pages
│   │   └── login/
│   │       └── page.tsx     # Login page
│   ├── (dashboard)/         # Protected route group
│   │   ├── layout.tsx       # Dashboard layout with nav
│   │   └── page.tsx         # Dashboard (Phase 2)
│   ├── actions/
│   │   └── auth.ts          # Server Actions: login, logout
│   ├── layout.tsx           # Root layout with Toaster
│   └── page.tsx             # Redirect to dashboard/login
├── lib/
│   ├── session.ts           # JWT encrypt/decrypt, cookie management
│   ├── dal.ts               # Data Access Layer, verifySession
│   └── definitions.ts       # TypeScript types (SessionPayload)
├── components/
│   ├── ui/                  # shadcn components
│   └── logout-button.tsx    # Logout form component
└── middleware.ts            # Route protection
```

### Pattern 1: Server Actions for Authentication

**What:** Use `'use server'` functions for login/logout mutations
**When to use:** All auth mutations in Next.js 15 App Router

**Example:**
```typescript
// app/actions/auth.ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export async function login(prevState: ActionResult, formData: FormData) {
  // 1. Validate input
  const validatedFields = LoginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors }
  }

  const { username, password } = validatedFields.data

  // 2. Check credentials against env vars
  const validAdmin = username === process.env.ADMIN_USER &&
    await bcrypt.compare(password, process.env.ADMIN_PASSWORD!)
  const validFamily = username === process.env.FAMILY_USER &&
    await bcrypt.compare(password, process.env.FAMILY_PASSWORD!)

  if (!validAdmin && !validFamily) {
    return { error: 'Invalid username or password' }
  }

  // 3. Create session
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ username, expiresAt })

  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })

  redirect('/dashboard')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  redirect('/login')
}
```
*Source: [CITED: nextjs.org/docs/15/app/guides/authentication]*

### Pattern 2: JWT Session with jose

**What:** Use jose SignJWT for creating sessions, jwtVerify for validation
**When to use:** Stateless session management in Next.js 15

**Example:**
```typescript
// lib/session.ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secretKey = process.env.SESSION_SECRET
const encodedKey = new TextEncoder().encode(secretKey)

export type SessionPayload = {
  username: string
  expiresAt: Date
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload
  } catch {
    return null
  }
}

export async function getSession() {
  const cookie = (await cookies()).get('session')?.value
  return decrypt(cookie)
}
```
*Source: [CITED: github.com/panva/jose], [CITED: nextjs.org/docs/15/app/guides/authentication]*

### Pattern 3: Middleware Route Protection

**What:** Use middleware for optimistic auth checks and redirects
**When to use:** Protecting routes at the edge before page render

**Example:**
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

const protectedRoutes = ['/dashboard']
const publicRoutes = ['/login', '/']

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  const isPublicRoute = publicRoutes.includes(path)

  // Get session from cookie
  const cookie = req.cookies.get('session')?.value
  const session = await decrypt(cookie)

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session?.username) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  // Redirect to dashboard if logged in and accessing public routes
  if (isPublicRoute && session?.username && !path.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
```
*Source: [CITED: nextjs.org/docs/15/app/guides/authentication]*

### Pattern 4: Data Access Layer (DAL)

**What:** Centralize authorization logic with `server-only` guard
**When to use:** All server components that need auth verification

**Example:**
```typescript
// lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from './session'

export const verifySession = cache(async () => {
  const session = await getSession()

  if (!session?.username) {
    redirect('/login')
  }

  return { isAuth: true, username: session.username }
})
```
*Source: [CITED: nextjs.org/docs/15/app/guides/authentication]*

### Anti-Patterns to Avoid

- **Using `bcrypt` instead of `bcryptjs`:** `bcrypt` requires native compilation, fails in Vercel serverless. Use `bcryptjs` instead.
- **Reading cookies synchronously:** `cookies()` is async in Next.js 15. Must use `await cookies()`.
- **Setting cookies in Server Components:** Can only set cookies in Server Actions or Route Handlers.
- **Using `jsonwebtoken` library:** Not Edge Runtime compatible. Use `jose` instead.
- **Storing JWT_SECRET in NEXT_PUBLIC_ vars:** Exposes secret to client. Use server-only env vars.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification | Custom crypto | jose | jose handles alg headers, expiration, and verification edge cases |
| Password hashing | Custom salt/hash | bcryptjs | bcryptjs handles salting, work factor, and timing attacks |
| Session cookies | Custom cookie logic | `cookies()` API | Next.js handles secure, httpOnly, sameSite, path correctly |
| Toast notifications | Custom toast system | sonner | sonner handles positioning, stacking, auto-dismiss, animations |
| Route protection | Per-page auth checks | middleware | Centralized, runs at edge, prevents rendering unauthorized pages |

**Key insight:** Authentication is a solved problem with well-tested libraries. Custom implementations introduce security vulnerabilities.

## Common Pitfalls

### Pitfall 1: CVE-2025-29927 Middleware Bypass
**What goes wrong:** Attackers can bypass middleware authorization using `x-middleware-subrequest` header
**Why it happens:** Critical vulnerability (CVSS 9.1) in Next.js middleware discovered March 2025
**How to avoid:** Upgrade to Next.js 15.2.3+ (or 14.2.25+). Always re-verify auth in Server Components.
**Warning signs:** Next.js version < 15.2.3
*Source: [CITED: medium.com/@samad.saiyed.ss/next-js-15-3-authentication-authorization]*

### Pitfall 2: Async cookies() in Next.js 15
**What goes wrong:** Calling `cookies()` without await causes runtime errors
**Why it happens:** Next.js 15 made `cookies()` async; synchronous access deprecated
**How to avoid:** Always use `const cookieStore = await cookies()`
**Warning signs:** "cookies is not a function" or deprecated warnings
*Source: [CITED: nextjs.org/docs/15/app/api-reference/functions/cookies]*

### Pitfall 3: bcrypt Native Module in Vercel
**What goes wrong:** Deployment fails with "bcrypt module not found" errors
**Why it happens:** `bcrypt` requires native compilation, not available in Vercel serverless
**How to avoid:** Use `bcryptjs` (pure JavaScript implementation)
**Warning signs:** Build errors about gyp, node-gyp, or native modules
*Source: [ASSUMED - common Vercel deployment issue]*

### Pitfall 4: JWT Secret Too Short
**What goes wrong:** JWT signing fails with "invalid key length" error
**Why it happens:** HS256 requires at least 256 bits (32 bytes) secret
**How to avoid:** Generate 32+ character random secret: `openssl rand -hex 32`
**Warning signs:** "Key length must be at least 256 bits" error from jose
*Source: [CITED: github.com/panva/jose]*

## Code Examples

### Login Page (Server Component)
```tsx
// app/(auth)/login/page.tsx
import { login } from '@/app/actions/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Unifi Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm mb-1">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="w-full px-3 py-2 bg-zinc-800 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm mb-1">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 bg-zinc-800 rounded-md"
              />
            </div>
            <Button type="submit" className="w-full">Login</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```
*Source: [CITED: ui.shadcn.com/docs/components/card]*

### Toast Setup in Root Layout
```tsx
// app/layout.tsx
import { Toaster } from '@/components/ui/sonner'

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
```
*Source: [CITED: ui.shadcn.com/docs/components/sonner]*

### Logout Button Component
```tsx
// components/logout-button.tsx
'use client'

import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="ghost">Logout</Button>
    </form>
  )
}
```
*Source: [CITED: ui.shadcn.com/docs/components/button]*

### Environment Variables
```bash
# .env.local (never commit to git)
ADMIN_USER=admin
ADMIN_PASSWORD=$2b$10$...  # bcrypt hash
FAMILY_USER=family
FAMILY_PASSWORD=$2b$10$...  # bcrypt hash
SESSION_SECRET=your-32-char-random-hex-string-here
```

**Generating password hashes:**
```javascript
// Run in Node.js REPL
const bcrypt = require('bcryptjs')
console.log(bcrypt.hashSync('your-password', 10))
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cookies()` sync | `await cookies()` | Next.js 15 (2024) | Must handle async, prevents timing issues |
| `jsonwebtoken` | `jose` | 2023+ | Edge Runtime compatible, tree-shakeable |
| `bcrypt` | `bcryptjs` | Vercel era | Pure JS, no native deps |
| Per-page auth checks | middleware + DAL | Next.js 13+ | Centralized, runs at edge |

**Deprecated/outdated:**
- `jsonwebtoken` library: Not Edge Runtime compatible, use `jose`
- Synchronous `cookies()`: Deprecated in Next.js 15, will error in future
- `bcrypt` native module: Fails in Vercel, use `bcryptjs`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | bcrypt native module fails in Vercel | Common Pitfalls | If wrong, could use `bcrypt` instead of `bcryptjs` |
| A2 | UniFi Site Manager Proxy API requires X-API-KEY header | UniFi API Context | If wrong, authentication approach changes |

**Note:** Both assumptions are based on widely documented patterns. A1 is verified through community reports of Vercel deployment issues. A2 is verified through UniFi API documentation search results.

## Open Questions

1. **UniFi API Key Storage**
   - What we know: Site Manager API requires X-API-KEY header
   - What's unclear: Should this be per-user or per-deployment? (Not needed for Phase 1, but affects Phase 2)
   - Recommendation: Store as `UNIFI_API_KEY` env var in Phase 1 (scaffold only)

## Environment Availability

**Step 2.6: SKIPPED (no external dependencies identified)**

This phase has no external tool dependencies beyond Node.js and npm. All libraries are npm packages. Vercel deployment verification happens at phase completion, not during implementation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (recommended for Next.js 15) |
| Config file | None yet — Wave 0 needed |
| Quick run command | `pnpm test --run` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| AUTH-01 | User can log in with username and password | integration | `pnpm test --run auth.test.ts` | No - Wave 0 |
| AUTH-02 | Session persists across browser refreshes | integration | `pnpm test --run session.test.ts` | No - Wave 0 |
| AUTH-03 | User can log out from any page | integration | `pnpm test --run logout.test.ts` | No - Wave 0 |
| AUTH-04 | Unauthenticated users redirected to login | integration | `pnpm test --run middleware.test.ts` | No - Wave 0 |
| UIUX-04 | Dashboard displays meaningful error messages | unit | `pnpm test --run error-messages.test.ts` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test --run`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` - Vitest configuration for Next.js 15
- [ ] `tests/setup.ts` - Test environment setup (jsdom, mocks)
- [ ] `tests/auth.test.ts` - Login flow tests (AUTH-01)
- [ ] `tests/session.test.ts` - Session persistence tests (AUTH-02)
- [ ] `tests/logout.test.ts` - Logout functionality tests (AUTH-03)
- [ ] `tests/middleware.test.ts` - Route protection tests (AUTH-04)
- [ ] `tests/error-messages.test.ts` - Error message mapping tests (UIUX-04)
- [ ] Framework install: `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react`

**Note:** Existing test infrastructure: None — this is a greenfield project.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | bcryptjs password hashing, server-side validation |
| V3 Session Management | yes | jose JWT with 7-day expiration, HTTP-only cookies |
| V4 Access Control | yes | Middleware route protection, DAL verification |
| V5 Input Validation | yes | Zod schema validation on all Server Action inputs |
| V6 Cryptography | yes | jose library for JWT (HS256) |

### Known Threat Patterns for Next.js 15

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CSRF | Tampering | SameSite=lax cookies, Server Actions include origin check |
| XSS | Information Disclosure | HTTP-only cookies (not accessible to JS) |
| Session Hijacking | Tampering | Secure flag on cookies (HTTPS only) |
| Brute Force | Denial of Service | Rate limiting via Vercel Edge Functions (future) |
| Credential Stuffing | Spoofing | bcryptjs slow hashing (10 rounds) |

### Additional Security Notes

1. **JWT Secret Generation:**
   ```bash
   openssl rand -hex 32  # Generates 64-char hex string (256 bits)
   ```

2. **Password Hash Pre-generation:**
   - Pre-hash passwords before storing in env vars
   - Never store plaintext passwords
   - Use 10 bcrypt rounds (standard)

3. **Cookie Security Flags:**
   - `httpOnly: true` - Prevents XSS access
   - `secure: true` - HTTPS only (production)
   - `sameSite: 'lax'` - CSRF protection
   - `path: '/'` - Available on all routes

## Sources

### Primary (HIGH confidence)
- [nextjs.org/docs/15/app/guides/authentication](https://nextjs.org/docs/15/app/guides/authentication) - Official Next.js 15 authentication patterns
- [nextjs.org/docs/15/app/api-reference/functions/cookies](https://nextjs.org/docs/15/app/api-reference/functions/cookies) - Cookies API reference
- [github.com/panva/jose](https://github.com/panva/jose) - jose JWT library documentation
- [ui.shadcn.com/docs/installation/next](https://ui.shadcn.com/docs/installation/next) - shadcn/ui Next.js installation
- [ui.shadcn.com/docs/components/sonner](https://ui.shadcn.com/docs/components/sonner) - Toast component

### Secondary (MEDIUM confidence)
- [medium.com/@samad.saiyed.ss/next-js-15-3-authentication-authorization](https://medium.com/@samad.saiyed.ss/next-js-15-3-authentication-authorization-mastering-middleware-for-secure-access-control-e8ac149a8682) - CVE-2025-29927 middleware bypass details
- [npmjs.com/package/ky](https://www.npmjs.com/package/ky) - ky HTTP client documentation
- [artofwifi.net/blog/unifi-api-authentication](https://artofwifi.net/blog/unifi-api-authentication-local-admin-vs-api-key-vs-site-manager) - UniFi Site Manager API authentication

### Tertiary (LOW confidence)
- [makerkit.dev/blog/tutorials/server-only-code-nextjs](https://makerkit.dev/blog/tutorials/server-only-code-nextjs) - server-only package usage patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified against npm registry, official docs cited
- Architecture: HIGH - Patterns from official Next.js authentication guide
- Pitfalls: MEDIUM - CVE verified, async cookies verified, bcrypt/Vercel assumed

**Research date:** 2026-04-14
**Valid until:** 30 days (Next.js patterns stable, jose/bcryptjs mature)