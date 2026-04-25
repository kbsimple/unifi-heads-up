// tests/lib/unifi/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock undici for API client tests
vi.mock('undici', () => ({
  Agent: vi.fn().mockImplementation(() => ({})),
  fetch: vi.fn(),
}))

// Mock server-only
vi.mock('server-only', () => ({}))

import { fetch, Agent } from 'undici'
import { getUnifiClients } from '@/lib/unifi/client'

describe('getUnifiClients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set required env vars
    process.env.UNIFI_HOST = '192.168.1.1'
    process.env.UNIFI_API_KEY = 'test-api-key'
    delete process.env.UNIFI_CONSOLE_ID
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return NetworkClient array with transformed data', async () => {
    // Mock successful API response
    const mockResponse = [
      {
        _id: 'client-1',
        mac: 'aa:bb:cc:dd:ee:ff',
        name: 'iPhone',
        hostname: 'iPhone.local',
        ip: '192.168.1.100',
        last_seen: 1712928000000,
        is_wired: false,
        is_guest: false,
        'rx_bytes-r': 125000, // 1 Mbps
        'tx_bytes-r': 125000, // 1 Mbps
      },
    ]

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response)

    const result = await getUnifiClients()

    expect(result.clients).toHaveLength(1)
    expect(result.clients[0]).toMatchObject({
      id: 'client-1',
      mac: 'aa:bb:cc:dd:ee:ff',
      displayName: 'iPhone',
      ip: '192.168.1.100',
      isWired: false,
      isGuest: false,
      downloadRate: 125000,
      uploadRate: 125000,
      trafficStatus: 'low', // 2 Mbps total = low
    })
    expect(result.timestamp).toBeDefined()
  })

  it('should handle API error and throw', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    await expect(getUnifiClients()).rejects.toThrow()
  })

  it('should use hostname as displayName when name is null', async () => {
    const mockResponse = [
      {
        _id: 'client-2',
        mac: 'aa:bb:cc:dd:ee:00',
        name: null,
        hostname: 'device.local',
        ip: '192.168.1.101',
        last_seen: null,
        is_wired: true,
        is_guest: false,
        'rx_bytes-r': 0,
        'tx_bytes-r': 0,
      },
    ]

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response)

    const result = await getUnifiClients()

    expect(result.clients[0].displayName).toBe('device.local')
  })

  it('should use MAC as displayName when both name and hostname are null', async () => {
    const mockResponse = [
      {
        _id: 'client-3',
        mac: 'aa:bb:cc:dd:ee:11',
        name: null,
        hostname: null,
        ip: null,
        last_seen: null,
        is_wired: false,
        is_guest: true,
        'rx_bytes-r': 0,
        'tx_bytes-r': 0,
      },
    ]

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response)

    const result = await getUnifiClients()

    expect(result.clients[0].displayName).toBe('aa:bb:cc:dd:ee:11')
  })

  it('creates undici Agent with rejectUnauthorized: false', async () => {
    // Re-import to ensure module evaluation captures the Agent call
    vi.resetModules()
    const { Agent } = await import('undici')
    await import('@/lib/unifi/client')
    expect(Agent).toHaveBeenCalledWith({
      connect: { rejectUnauthorized: false },
    })
  })

  it('throws when UNIFI_HOST is missing', async () => {
    delete process.env.UNIFI_HOST
    await expect(getUnifiClients()).rejects.toThrow(
      'UNIFI_HOST and UNIFI_API_KEY environment variables are required'
    )
  })

  it('sends X-API-KEY header to UNIFI_HOST-based URL', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve([]),
    } as unknown as Response)
    await getUnifiClients()
    expect(fetch).toHaveBeenCalledWith(
      'https://192.168.1.1/proxy/network/v2/api/site/default/stat/sta',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-API-KEY': 'test-api-key',
          'Content-Type': 'application/json',
        }),
      })
    )
  })
})
