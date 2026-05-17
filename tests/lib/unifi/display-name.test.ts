// tests/lib/unifi/display-name.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock undici for API client tests
vi.mock('undici', () => ({
  Agent: vi.fn().mockImplementation(function () { return {} }),
  fetch: vi.fn(),
}))

// Mock server-only
vi.mock('server-only', () => ({}))

import { fetch } from 'undici'
import { getUnifiClients } from '@/lib/unifi/client'

function mockFetchWith(clients: object[]) {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(clients),
  } as unknown as Response)
}

const BASE_CLIENT = {
  _id: 'c1',
  mac: 'aa:bb:cc:dd:ee:ff',
  name: null,
  hostname: null,
  oui: null,
  ip: '192.168.1.1',
  last_seen: null,
  is_wired: false,
  is_guest: false,
  'rx_bytes-r': 0,
  'tx_bytes-r': 0,
}

describe('resolveDisplayName (via getUnifiClients)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UNIFI_HOST = '192.168.1.1'
    process.env.UNIFI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('uses name when present', async () => {
    mockFetchWith([{ ...BASE_CLIENT, name: 'My iPhone' }])
    const { clients } = await getUnifiClients()
    expect(clients[0].displayName).toBe('My iPhone')
  })

  it('uses hostname when name is null and hostname is readable', async () => {
    mockFetchWith([{ ...BASE_CLIENT, hostname: 'device.local' }])
    const { clients } = await getUnifiClients()
    expect(clients[0].displayName).toBe('device.local')
  })

  it('skips serial-style hostname (all caps+digits, 8+ chars) and falls through to oui+mac', async () => {
    mockFetchWith([{
      ...BASE_CLIENT,
      hostname: '09AA01AC271502VB',
      oui: 'Apple Inc.',
    }])
    const { clients } = await getUnifiClients()
    // OUI "Apple Inc." cleaned to "Apple Inc" (trailing dot stripped if present), last 5 chars of mac = "ee:ff"
    expect(clients[0].displayName).not.toBe('09AA01AC271502VB')
    expect(clients[0].displayName).toContain('ee:ff')
  })

  it('another serial-style hostname (A4E3F1B2C9D8) is skipped', async () => {
    mockFetchWith([{
      ...BASE_CLIENT,
      mac: 'aa:bb:cc:dd:ee:11',
      hostname: 'A4E3F1B2C9D8',
      oui: null,
    }])
    const { clients } = await getUnifiClients()
    // No oui → falls back to full MAC
    expect(clients[0].displayName).toBe('aa:bb:cc:dd:ee:11')
  })

  it('uses cleaned OUI + last-5-MAC when no name and no readable hostname', async () => {
    mockFetchWith([{
      ...BASE_CLIENT,
      mac: 'aa:bb:cc:00:0b:50',
      hostname: null,
      oui: 'Samsung Electronics Co.,Ltd',
    }])
    const { clients } = await getUnifiClients()
    // cleanOui strips "Electronics Co.,Ltd" entirely → "Samsung"
    expect(clients[0].displayName).toBe('Samsung 0b:50')
  })

  it('strips "Co.,Ltd" suffix from OUI', async () => {
    mockFetchWith([{
      ...BASE_CLIENT,
      mac: 'aa:bb:cc:dd:0b:50',
      hostname: null,
      oui: 'Some Brand Co.,Ltd',
    }])
    const { clients } = await getUnifiClients()
    expect(clients[0].displayName).toBe('Some Brand 0b:50')
  })

  it('strips "Inc." suffix from OUI', async () => {
    mockFetchWith([{
      ...BASE_CLIENT,
      mac: 'aa:bb:cc:dd:0b:51',
      hostname: null,
      oui: 'Apple Inc.',
    }])
    const { clients } = await getUnifiClients()
    expect(clients[0].displayName).toBe('Apple 0b:51')
  })

  it('strips "LLC." suffix from OUI', async () => {
    mockFetchWith([{
      ...BASE_CLIENT,
      mac: 'aa:bb:cc:dd:0b:52',
      hostname: null,
      oui: 'Ring LLC.',
    }])
    const { clients } = await getUnifiClients()
    expect(clients[0].displayName).toBe('Ring 0b:52')
  })

  it('falls back to full MAC when no name, no hostname, and empty oui', async () => {
    mockFetchWith([{
      ...BASE_CLIENT,
      mac: 'aa:bb:cc:dd:ee:ff',
      hostname: null,
      oui: null,
    }])
    const { clients } = await getUnifiClients()
    expect(clients[0].displayName).toBe('aa:bb:cc:dd:ee:ff')
  })

  it('prefers name over readable hostname', async () => {
    mockFetchWith([{ ...BASE_CLIENT, name: 'Dad iPad', hostname: 'ipad.local' }])
    const { clients } = await getUnifiClients()
    expect(clients[0].displayName).toBe('Dad iPad')
  })
})
