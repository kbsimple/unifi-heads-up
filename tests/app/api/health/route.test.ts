// tests/app/api/health/route.test.ts
import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('returns HTTP 200', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
  })

  it('returns { ok: true }', async () => {
    const response = await GET()
    const body = await response.json()
    expect(body).toEqual({ ok: true })
  })

  it('requires no authentication', async () => {
    // Calling GET with no session mock still returns 200
    const response = await GET()
    expect(response.status).toBe(200)
  })
})
