// tests/session.test.ts
import { describe, it, expect, vi } from 'vitest'
import type { SessionPayload } from '@/lib/definitions'

// Mock jose module to avoid jsdom compatibility issues
vi.mock('jose', () => ({
  SignJWT: class MockSignJWT {
    private payload: Record<string, unknown>
    private header: Record<string, string> = {}
    private issuedAt: number = 0
    private expirationTime: string = ''

    constructor(payload: Record<string, unknown>) {
      this.payload = payload
    }

    setProtectedHeader(header: Record<string, string>) {
      this.header = header
      return this
    }

    setIssuedAt() {
      this.issuedAt = Math.floor(Date.now() / 1000)
      return this
    }

    setExpirationTime(exp: string) {
      this.expirationTime = exp
      return this
    }

    async sign(_key: Uint8Array) {
      // Simple mock: create a JWT-like string
      const headerB64 = Buffer.from(JSON.stringify(this.header)).toString('base64url')
      const payloadB64 = Buffer.from(JSON.stringify({
        ...this.payload,
        iat: this.issuedAt,
        exp: this.expirationTime,
      })).toString('base64url')
      const signatureB64 = Buffer.from('mock-signature').toString('base64url')
      return `${headerB64}.${payloadB64}.${signatureB64}`
    }
  },

  jwtVerify: async (token: string, _key: Uint8Array, _options: { algorithms: string[] }) => {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('Invalid JWT')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      return { payload }
    } catch {
      throw new Error('Invalid token')
    }
  },
}))

// Import after mocking
const { encrypt, decrypt } = await import('@/lib/session')

describe('Session Management (AUTH-02)', () => {
  describe('encrypt', () => {
    it('creates a signed JWT token', async () => {
      const payload: SessionPayload = {
        username: 'testuser',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
      const token = await encrypt(payload)
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // JWT has 3 parts
    })
  })

  describe('decrypt', () => {
    it('returns payload for valid token', async () => {
      const payload: SessionPayload = {
        username: 'testuser',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
      const token = await encrypt(payload)
      const result = await decrypt(token)
      expect(result?.username).toBe('testuser')
    })

    it('returns null for invalid token', async () => {
      const result = await decrypt('invalid-token')
      expect(result).toBeNull()
    })

    it('returns null for empty string', async () => {
      const result = await decrypt('')
      expect(result).toBeNull()
    })

    it('returns null for undefined', async () => {
      const result = await decrypt(undefined)
      expect(result).toBeNull()
    })
  })
})