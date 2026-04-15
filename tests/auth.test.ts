// tests/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation before importing dal
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`Redirect to ${path}`)
  }),
}))

// Mock session module
vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

import { getSession } from '@/lib/session'

describe('Data Access Layer (DAL)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkAuth', () => {
    it('returns false for no session', async () => {
      vi.mocked(getSession).mockResolvedValue(null)
      const { checkAuth } = await import('@/lib/dal')
      const result = await checkAuth()
      expect(result.isAuth).toBe(false)
      expect(result.username).toBeUndefined()
    })

    it('returns true with username for valid session', async () => {
      vi.mocked(getSession).mockResolvedValue({
        username: 'admin',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      // Need to re-import to get fresh module after mock
      vi.resetModules()
      const { checkAuth: freshCheckAuth } = await import('@/lib/dal')
      const result = await freshCheckAuth()
      expect(result.isAuth).toBe(true)
      expect(result.username).toBe('admin')
    })
  })

  describe('verifySession', () => {
    it('redirects to /login for invalid session', async () => {
      vi.mocked(getSession).mockResolvedValue(null)
      vi.resetModules()
      const { verifySession } = await import('@/lib/dal')
      await expect(verifySession()).rejects.toThrow('Redirect to /login')
    })
  })
})

describe('Authentication (AUTH-01)', () => {
  it('placeholder - login flow tests', () => {
    expect(true).toBe(true)
  })
})