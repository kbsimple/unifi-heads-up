// tests/middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock the decrypt function before importing middleware
vi.mock('@/lib/session', () => ({
  decrypt: vi.fn((token: string | undefined) => {
    if (token === 'valid-token') {
      return Promise.resolve({ username: 'testuser', expiresAt: new Date() })
    }
    return Promise.resolve(null)
  }),
}))

describe('Route Protection (AUTH-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated users from /dashboard to /login', async () => {
    // Import after mock setup
    const { default: middleware } = await import('@/middleware')

    const req = new NextRequest(new URL('http://localhost/dashboard'), {
      headers: new Headers(),
    })

    const response = await middleware(req)
    expect(response.status).toBe(307) // Redirect status
    expect((response as NextResponse).headers.get('location')).toContain('/login')
  })

  it('allows authenticated users to access /dashboard', async () => {
    const { default: middleware } = await import('@/middleware')

    const req = new NextRequest(new URL('http://localhost/dashboard'), {
      headers: new Headers(),
    })
    // Add valid session cookie
    req.cookies.set('session', 'valid-token')

    const response = await middleware(req)
    expect(response.status).toBe(200)
  })

  it('redirects authenticated users from /login to /dashboard', async () => {
    const { default: middleware } = await import('@/middleware')

    const req = new NextRequest(new URL('http://localhost/login'), {
      headers: new Headers(),
    })
    req.cookies.set('session', 'valid-token')

    const response = await middleware(req)
    expect(response.status).toBe(307)
    expect((response as NextResponse).headers.get('location')).toContain('/dashboard')
  })

  it('allows unauthenticated users to access /login', async () => {
    const { default: middleware } = await import('@/middleware')

    const req = new NextRequest(new URL('http://localhost/login'), {
      headers: new Headers(),
    })

    const response = await middleware(req)
    expect(response.status).toBe(200)
  })

  it('allows unauthenticated users to access root path', async () => {
    const { default: middleware } = await import('@/middleware')

    const req = new NextRequest(new URL('http://localhost/'), {
      headers: new Headers(),
    })

    const response = await middleware(req)
    expect(response.status).toBe(200)
  })

  it('protects nested routes under /dashboard', async () => {
    const { default: middleware } = await import('@/middleware')

    const req = new NextRequest(new URL('http://localhost/dashboard/devices'), {
      headers: new Headers(),
    })

    const response = await middleware(req)
    expect(response.status).toBe(307)
    expect((response as NextResponse).headers.get('location')).toContain('/login')
  })

  it('allows authenticated users to access nested routes under /dashboard', async () => {
    const { default: middleware } = await import('@/middleware')

    const req = new NextRequest(new URL('http://localhost/dashboard/settings'), {
      headers: new Headers(),
    })
    req.cookies.set('session', 'valid-token')

    const response = await middleware(req)
    expect(response.status).toBe(200)
  })

  it('does not redirect authenticated users already on /dashboard', async () => {
    const { default: middleware } = await import('@/middleware')

    const req = new NextRequest(new URL('http://localhost/dashboard'), {
      headers: new Headers(),
    })
    req.cookies.set('session', 'valid-token')

    const response = await middleware(req)
    expect(response.status).toBe(200)
  })
})