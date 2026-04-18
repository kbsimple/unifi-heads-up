// tests/app/api/firewall/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, PUT } from '@/app/api/firewall/route'

// Mock the UniFi client
vi.mock('@/lib/unifi/client', () => ({
  getFirewallPolicies: vi.fn(),
  updateFirewallPolicy: vi.fn(),
}))

// Mock session
vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

// Mock server-only
vi.mock('server-only', () => ({}))

import { getFirewallPolicies, updateFirewallPolicy } from '@/lib/unifi/client'
import { getSession } from '@/lib/session'

describe('GET /api/firewall', () => {
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
    const data = await response.json()
    expect(data.error).toBe('UNAUTHORIZED')
  })

  it('should return policies array with timestamp when authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(getFirewallPolicies).mockResolvedValue([
      { _id: 'policy-1', name: 'Block Gaming', enabled: true },
      { _id: 'policy-2', name: 'Block Social', enabled: false },
    ])

    const response = await GET()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.policies).toHaveLength(2)
    expect(data.policies[0].name).toBe('Block Gaming')
    expect(data.policies[1].name).toBe('Block Social')
    expect(typeof data.timestamp).toBe('number')
  })

  it('should return 503 on network error', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(getFirewallPolicies).mockRejectedValue(new Error('fetch failed: network error'))

    const response = await GET()

    expect(response.status).toBe(503)
    const data = await response.json()
    expect(data.error).toBe('NETWORK_ERROR')
  })

  it('should return 500 on API error', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(getFirewallPolicies).mockRejectedValue(new Error('API error'))

    const response = await GET()

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('API_ERROR')
  })
})

describe('PUT /api/firewall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const response = await PUT(new Request('http://localhost/api/firewall', {
      method: 'PUT',
      body: JSON.stringify({ policyId: 'policy-1', enabled: false }),
    }))

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('UNAUTHORIZED')
  })

  it('should return 400 when policyId missing', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })

    const response = await PUT(new Request('http://localhost/api/firewall', {
      method: 'PUT',
      body: JSON.stringify({ enabled: false }),
    }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('VALIDATION_ERROR')
  })

  it('should return 400 when enabled missing', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })

    const response = await PUT(new Request('http://localhost/api/firewall', {
      method: 'PUT',
      body: JSON.stringify({ policyId: 'policy-1' }),
    }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('VALIDATION_ERROR')
  })

  it('should return updated policy on success', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(updateFirewallPolicy).mockResolvedValue({ _id: 'policy-1', name: 'Block Gaming', enabled: false })

    const response = await PUT(new Request('http://localhost/api/firewall', {
      method: 'PUT',
      body: JSON.stringify({ policyId: 'policy-1', enabled: false }),
    }))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data._id).toBe('policy-1')
    expect(data.enabled).toBe(false)
    expect(vi.mocked(updateFirewallPolicy)).toHaveBeenCalledWith('policy-1', false)
  })

  it('should return 503 on network error', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(updateFirewallPolicy).mockRejectedValue(new Error('fetch failed: network error'))

    const response = await PUT(new Request('http://localhost/api/firewall', {
      method: 'PUT',
      body: JSON.stringify({ policyId: 'policy-1', enabled: false }),
    }))

    expect(response.status).toBe(503)
    const data = await response.json()
    expect(data.error).toBe('NETWORK_ERROR')
  })

  it('should return 500 on API error', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(updateFirewallPolicy).mockRejectedValue(new Error('API error'))

    const response = await PUT(new Request('http://localhost/api/firewall', {
      method: 'PUT',
      body: JSON.stringify({ policyId: 'policy-1', enabled: false }),
    }))

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('API_ERROR')
  })
})