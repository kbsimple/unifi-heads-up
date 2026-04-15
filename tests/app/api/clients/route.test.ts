// tests/app/api/clients/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/clients/route'

// Mock the UniFi client
vi.mock('@/lib/unifi/client', () => ({
  getUnifiClients: vi.fn(),
}))

// Mock session
vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

// Mock server-only
vi.mock('server-only', () => ({}))

import { getUnifiClients } from '@/lib/unifi/client'
import { getSession } from '@/lib/session'

describe('GET /api/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it('should return 200 with clients data on success', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(getUnifiClients).mockResolvedValue({
      clients: [
        {
          id: 'client-1',
          mac: 'aa:bb:cc:dd:ee:ff',
          displayName: 'iPhone',
          ip: '192.168.1.100',
          lastSeen: new Date(),
          isWired: false,
          isGuest: false,
          downloadRate: 125000,
          uploadRate: 125000,
          trafficStatus: 'low',
        },
      ],
      timestamp: Date.now(),
    })

    const response = await GET()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.clients).toHaveLength(1)
    expect(data.clients[0].displayName).toBe('iPhone')
  })

  it('should return 503 on network error', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(getUnifiClients).mockRejectedValue(new Error('fetch failed: network error'))

    const response = await GET()

    expect(response.status).toBe(503)
    const data = await response.json()
    expect(data.error).toBe('NETWORK_ERROR')
  })

  it('should return 500 on API error', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(getUnifiClients).mockRejectedValue(new Error('API error'))

    const response = await GET()

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('API_ERROR')
  })
})