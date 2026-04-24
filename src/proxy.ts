// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

// Protected routes require authentication
const protectedRoutes = ['/dashboard']

// Public routes accessible without authentication
const publicRoutes = ['/login', '/']

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  )
  const isPublicRoute = publicRoutes.includes(path)

  // Get session from cookie
  // Note: cookies() doesn't work in middleware, use req.cookies
  const cookie = req.cookies.get('session')?.value
  const session = await decrypt(cookie)

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session?.username) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  // Redirect to dashboard if logged in and accessing public routes
  if (
    isPublicRoute &&
    session?.username &&
    !path.startsWith('/dashboard')
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

// Configure which routes the middleware runs on
// Exclude static files, images, and API routes
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}