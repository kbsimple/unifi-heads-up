// tests/lib/unifi/firewall.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  FirewallPolicySchema,
  FirewallPolicyResponseSchema,
} from '@/lib/unifi/types'

// Mock undici for API client tests
vi.mock('undici', () => ({
  Agent: vi.fn().mockImplementation(function () { return {} }),
  fetch: vi.fn(),
}))

// Mock server-only
vi.mock('server-only', () => ({}))

import { fetch } from 'undici'
import {
  isZoneBasedFirewallEnabled,
  getFirewallPolicies,
  updateFirewallPolicy,
} from '@/lib/unifi/client'

describe('FirewallPolicySchema', () => {
  it('should validate a valid firewall policy', () => {
    const validPolicy = {
      _id: 'abc123',
      name: 'Test Rule',
      enabled: true,
    }

    const result = FirewallPolicySchema.parse(validPolicy)

    expect(result).toEqual(validPolicy)
  })

  it('should reject missing _id field', () => {
    const invalidPolicy = {
      name: 'Test Rule',
      enabled: true,
    }

    const result = FirewallPolicySchema.safeParse(invalidPolicy)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('_id'))).toBe(true)
    }
  })

  it('should reject non-boolean enabled field', () => {
    const invalidPolicy = {
      _id: 'abc123',
      name: 'Test Rule',
      enabled: 'yes', // Invalid: should be boolean
    }

    const result = FirewallPolicySchema.safeParse(invalidPolicy)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('enabled'))).toBe(true)
    }
  })

  it('should accept enabled as false', () => {
    const policy = {
      _id: 'abc123',
      name: 'Disabled Rule',
      enabled: false,
    }

    const result = FirewallPolicySchema.parse(policy)

    expect(result.enabled).toBe(false)
  })
})

describe('FirewallPolicyResponseSchema', () => {
  it('should validate wrapped { data: [...] } response', () => {
    const wrappedResponse = {
      data: [
        { _id: 'policy-1', name: 'Rule 1', enabled: true },
        { _id: 'policy-2', name: 'Rule 2', enabled: false },
      ],
    }

    const result = FirewallPolicyResponseSchema.parse(wrappedResponse)

    expect(result).toHaveLength(2)
    expect(result[0]._id).toBe('policy-1')
    expect(result[1]._id).toBe('policy-2')
  })

  it('should validate direct array response', () => {
    const arrayResponse = [
      { _id: 'policy-1', name: 'Rule 1', enabled: true },
      { _id: 'policy-2', name: 'Rule 2', enabled: false },
    ]

    const result = FirewallPolicyResponseSchema.parse(arrayResponse)

    expect(result).toHaveLength(2)
    expect(result[0]._id).toBe('policy-1')
    expect(result[1]._id).toBe('policy-2')
  })

  it('should handle empty array response', () => {
    const emptyResponse: unknown[] = []

    const result = FirewallPolicyResponseSchema.parse(emptyResponse)

    expect(result).toHaveLength(0)
  })

  it('should handle empty wrapped response', () => {
    const emptyWrappedResponse = { data: [] }

    const result = FirewallPolicyResponseSchema.parse(emptyWrappedResponse)

    expect(result).toHaveLength(0)
  })
})

describe('isZoneBasedFirewallEnabled', () => {
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

  it('should return true when ZONE_BASED_FIREWALL in features', async () => {
    const mockResponse = [
      { feature: 'ZONE_BASED_FIREWALL', enabled: true },
      { feature: 'OTHER_FEATURE', enabled: false },
    ]

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response)

    const result = await isZoneBasedFirewallEnabled()

    expect(result).toBe(true)
  })

  it('should return false when ZONE_BASED_FIREWALL feature not present', async () => {
    const mockResponse = [
      { feature: 'OTHER_FEATURE', enabled: true },
    ]

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response)

    const result = await isZoneBasedFirewallEnabled()

    expect(result).toBe(false)
  })

  it('should return false when features array is empty', async () => {
    const mockResponse: unknown[] = []

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response)

    const result = await isZoneBasedFirewallEnabled()

    expect(result).toBe(false)
  })
})

describe('getFirewallPolicies', () => {
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

  it('should return array of FirewallPolicy objects', async () => {
    const mockResponse = [
      { _id: 'policy-1', name: 'Rule 1', enabled: true },
      { _id: 'policy-2', name: 'Rule 2', enabled: false },
    ]

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response)

    const result = await getFirewallPolicies()

    expect(result).toHaveLength(2)
    expect(result[0]._id).toBe('policy-1')
    expect(result[0].name).toBe('Rule 1')
    expect(result[0].enabled).toBe(true)
    expect(result[1]._id).toBe('policy-2')
    expect(result[1].enabled).toBe(false)
  })

  it('should handle wrapped { data: [...] } response', async () => {
    const mockResponse = {
      data: [
        { _id: 'policy-1', name: 'Rule 1', enabled: true },
      ],
    }

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response)

    const result = await getFirewallPolicies()

    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('policy-1')
  })

  it('should handle direct array response', async () => {
    const mockResponse = [
      { _id: 'policy-1', name: 'Rule 1', enabled: true },
    ]

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response)

    const result = await getFirewallPolicies()

    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('policy-1')
  })
})

describe('updateFirewallPolicy', () => {
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

  it('should send PUT with { enabled: boolean } body', async () => {
    const mockResponse = {
      _id: 'policy-1',
      name: 'Rule 1',
      enabled: false,
    }

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response)

    const result = await updateFirewallPolicy('policy-1', false)

    expect(fetch).toHaveBeenCalledWith(
      'https://192.168.1.1/proxy/network/v2/api/site/default/firewall-policies/policy-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ enabled: false }),
      })
    )
    expect(result.enabled).toBe(false)
  })

  it('should return updated FirewallPolicy', async () => {
    const mockResponse = {
      _id: 'policy-1',
      name: 'Rule 1',
      enabled: true,
    }

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response)

    const result = await updateFirewallPolicy('policy-1', true)

    expect(result._id).toBe('policy-1')
    expect(result.name).toBe('Rule 1')
    expect(result.enabled).toBe(true)
  })
})
