import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/firewall/device-rules/route'
import type { FirewallPolicy } from '@/lib/unifi/types'

vi.mock('@/lib/unifi', () => ({
  getFirewallPolicies: vi.fn(),
  isZoneBasedFirewallEnabled: vi.fn(),
}))

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('server-only', () => ({}))

import { getFirewallPolicies, isZoneBasedFirewallEnabled } from '@/lib/unifi'
import { getSession } from '@/lib/session'

function makeRequest(mac?: string) {
  const url = mac
    ? `http://localhost/api/firewall/device-rules?mac=${encodeURIComponent(mac)}`
    : 'http://localhost/api/firewall/device-rules'
  return new Request(url)
}

const zbfPolicies: FirewallPolicy[] = [
  { _id: 'p1', name: 'Block Switch', enabled: true, source: { client_macs: ['aa:bb:cc:dd:ee:06'] } },
  { _id: 'p2', name: 'Unrelated',    enabled: true },
]

const legacyPolicies: FirewallPolicy[] = [
  { _id: 'p3', name: 'Block MacBook', enabled: false, srcMac: 'aa:bb:cc:dd:ee:01' } as FirewallPolicy,
  { _id: 'p4', name: 'Unrelated',     enabled: true },
]

describe('GET /api/firewall/device-rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await GET(makeRequest('aa:bb:cc:dd:ee:06'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('UNAUTHORIZED')
  })

  it('returns 400 when mac param is missing', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date() })
    const res = await GET(makeRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('VALIDATION_ERROR')
  })

  it('returns matching rules in ZBF mode', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date() })
    vi.mocked(getFirewallPolicies).mockResolvedValue(zbfPolicies)
    vi.mocked(isZoneBasedFirewallEnabled).mockResolvedValue(true)

    const res = await GET(makeRequest('aa:bb:cc:dd:ee:06'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toEqual({ id: 'p1', name: 'Block Switch', enabled: true })
  })

  it('returns matching rules in legacy mode', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date() })
    vi.mocked(getFirewallPolicies).mockResolvedValue(legacyPolicies)
    vi.mocked(isZoneBasedFirewallEnabled).mockResolvedValue(false)

    const res = await GET(makeRequest('aa:bb:cc:dd:ee:01'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toEqual({ id: 'p3', name: 'Block MacBook', enabled: false })
  })

  it('returns empty array when no rules match (not an error)', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date() })
    vi.mocked(getFirewallPolicies).mockResolvedValue(legacyPolicies)
    vi.mocked(isZoneBasedFirewallEnabled).mockResolvedValue(false)

    const res = await GET(makeRequest('ff:ff:ff:ff:ff:ff'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('response shape contains only id, name, enabled — no extra fields', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date() })
    vi.mocked(getFirewallPolicies).mockResolvedValue(zbfPolicies)
    vi.mocked(isZoneBasedFirewallEnabled).mockResolvedValue(true)

    const res = await GET(makeRequest('aa:bb:cc:dd:ee:06'))
    const body = await res.json()
    expect(Object.keys(body[0]).sort()).toEqual(['enabled', 'id', 'name'])
  })
})
