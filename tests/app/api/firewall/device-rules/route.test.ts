import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/firewall/device-rules/route'
import type { FirewallPolicy } from '@/lib/unifi/types'

vi.mock('@/lib/unifi', () => ({
  getFirewallPolicies: vi.fn(),
}))

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('server-only', () => ({}))

import { getFirewallPolicies } from '@/lib/unifi'
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

const mixedPolicies: FirewallPolicy[] = [
  { _id: 'p1', name: 'Block Switch (ZBF)',    enabled: true,  source: { client_macs: ['aa:bb:cc:dd:ee:06'] } },
  { _id: 'p3', name: 'Block MacBook (legacy)', enabled: false, srcMac: 'aa:bb:cc:dd:ee:01' } as FirewallPolicy,
  { _id: 'p2', name: 'Unrelated',              enabled: true },
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

  it('matches ZBF policies (source.client_macs)', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date() })
    vi.mocked(getFirewallPolicies).mockResolvedValue(zbfPolicies)

    const res = await GET(makeRequest('aa:bb:cc:dd:ee:06'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toEqual({ id: 'p1', name: 'Block Switch', enabled: true })
  })

  it('matches legacy policies (srcMac)', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date() })
    vi.mocked(getFirewallPolicies).mockResolvedValue(legacyPolicies)

    const res = await GET(makeRequest('aa:bb:cc:dd:ee:01'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toEqual({ id: 'p3', name: 'Block MacBook', enabled: false })
  })

  it('matches both ZBF and legacy policies from a mixed policy list', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date() })
    vi.mocked(getFirewallPolicies).mockResolvedValue(mixedPolicies)

    const zbfRes = await GET(makeRequest('aa:bb:cc:dd:ee:06'))
    const zbfBody = await zbfRes.json()
    expect(zbfBody).toHaveLength(1)
    expect(zbfBody[0].id).toBe('p1')

    const legacyRes = await GET(makeRequest('aa:bb:cc:dd:ee:01'))
    const legacyBody = await legacyRes.json()
    expect(legacyBody).toHaveLength(1)
    expect(legacyBody[0].id).toBe('p3')
  })

  it('returns empty array when no rules match (not an error)', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date() })
    vi.mocked(getFirewallPolicies).mockResolvedValue(mixedPolicies)

    const res = await GET(makeRequest('ff:ff:ff:ff:ff:ff'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('response shape contains only id, name, enabled — no extra fields', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date() })
    vi.mocked(getFirewallPolicies).mockResolvedValue(zbfPolicies)

    const res = await GET(makeRequest('aa:bb:cc:dd:ee:06'))
    const body = await res.json()
    expect(Object.keys(body[0]).sort()).toEqual(['enabled', 'id', 'name'])
  })
})
