import { NextResponse } from 'next/server'
import { encrypt, createSessionCookieOptions } from '@/lib/session'

// Dev-only endpoint for screenshot automation
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ username: 'admin', expiresAt })
  const response = NextResponse.redirect(new URL('/dashboard', request.url))
  response.cookies.set('session', session, createSessionCookieOptions(expiresAt))
  return response
}
