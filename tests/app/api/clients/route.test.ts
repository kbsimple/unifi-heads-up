// tests/app/api/clients/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/clients/route'

// Mock the UniFi client
vi.mock('@/lib/unifi', () => ({
  getUnifiClients: vi.fn(),
}))

// Mock session
vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock the db cache functions
vi.mock('@/lib/db', () => ({
  getLatestClients: vi.fn(),
  upsertLatestClients: vi.fn(),
}))

import { getUnifiClients } from '@/lib/unifi'
import { getSession } from '@/lib/session'
import { getLatestClients, upsertLatestClients } from '@/lib/db'

const mockClient = {
  id: 'client-1',
  mac: 'aa:bb:cc:dd:ee:ff',
  displayName: 'iPhone',
  ip: '192.168.1.100',
  lastSeen: new Date(),
  isWired: false,
  isGuest: false,
  downloadRate: 125000,
  uploadRate: 125000,
  signal: null as number | null,
  trafficStatus: 'low' as const,
}

describe('GET /api/clients', () => {
  beforeEach(() => {
    // resetAllMocks (not clearAllMocks) so queued mockReturnValueOnce values
    // from a previous test can't bleed into the next one
    vi.resetAllMocks()
    // Default: no cache
    vi.mocked(getLatestClients).mockReturnValue(null)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should return 401 when no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const response = await GET(new Request('http://localhost/api/clients'))

    expect(response.status).toBe(401)
  })

  it('should return cache hit when fresh cache exists', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(getLatestClients).mockReturnValueOnce({
      clients: [mockClient],
      timestamp: Date.now(),
    })

    const response = await GET(new Request('http://localhost/api/clients'))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.cacheStatus).toBe('hit')
    expect(data.clients).toHaveLength(1)
    expect(data.clients[0].displayName).toBe('iPhone')
    // Should NOT call UniFi API - cache hit
    expect(getUnifiClients).not.toHaveBeenCalled()
  })

  it('should return stale cache and trigger background refresh', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    // Single cache lookup returns data older than CACHE_FRESH_MS (60s) → stale
    vi.mocked(getLatestClients).mockReturnValue({
      clients: [mockClient],
      timestamp: Date.now() - 120000, // 2 minutes old (stale)
    })
    // Mock getUnifiClients for the background refresh
    vi.mocked(getUnifiClients).mockResolvedValue({
      clients: [mockClient],
      timestamp: Date.now(),
    })

    const response = await GET(new Request('http://localhost/api/clients'))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.cacheStatus).toBe('stale')
    expect(data.clients).toHaveLength(1)
    // Should trigger background refresh
    expect(getUnifiClients).toHaveBeenCalled()
  })

  it('should return miss and fetch from UniFi when no cache exists', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(getLatestClients).mockReturnValue(null) // No cache at all
    vi.mocked(getUnifiClients).mockResolvedValue({
      clients: [mockClient],
      timestamp: Date.now(),
    })

    const response = await GET(new Request('http://localhost/api/clients'))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.cacheStatus).toBe('miss')
    expect(data.clients).toHaveLength(1)
    expect(getUnifiClients).toHaveBeenCalled()
    // Should cache the result
    expect(upsertLatestClients).toHaveBeenCalledWith([mockClient])
  })

  it('should return 503 on network error when no cache', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(getLatestClients).mockReturnValue(null)
    vi.mocked(getUnifiClients).mockRejectedValue(new Error('fetch failed: network error'))

    const response = await GET(new Request('http://localhost/api/clients'))

    expect(response.status).toBe(503)
    const data = await response.json()
    expect(data.error).toBe('NETWORK_ERROR')
  })

  it('should return 500 on API error when no cache', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(getLatestClients).mockReturnValue(null)
    vi.mocked(getUnifiClients).mockRejectedValue(new Error('API error'))

    const response = await GET(new Request('http://localhost/api/clients'))

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('API_ERROR')
  })
})