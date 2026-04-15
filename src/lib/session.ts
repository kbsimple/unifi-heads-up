// src/lib/session.ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { SessionPayload } from './definitions'

/**
 * Get the encoded secret key for JWT signing/verification
 * Lazily evaluated to allow env var to be set in tests
 */
function getEncodedKey() {
  const secretKey = process.env.SESSION_SECRET
  return new TextEncoder().encode(secretKey)
}

/**
 * Encrypt session payload into JWT token
 * Per D-03: 7-day session persistence via HTTP-only cookie
 */
export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getEncodedKey())
}

/**
 * Decrypt JWT token and return payload
 * Returns null if token is invalid or expired
 */
export async function decrypt(
  session: string | undefined = ''
): Promise<SessionPayload | null> {
  try {
    if (!session) return null
    const { payload } = await jwtVerify(session, getEncodedKey(), {
      algorithms: ['HS256'],
    })
    return payload as SessionPayload
  } catch {
    return null
  }
}

/**
 * Get current session from HTTP-only cookie
 * Per D-04: Server-side session validation
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  return decrypt(cookie)
}

/**
 * Create session cookie options for response
 * Returns cookie options for HTTP-only, secure cookie
 */
export function createSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax' as const,
    path: '/',
  }
}