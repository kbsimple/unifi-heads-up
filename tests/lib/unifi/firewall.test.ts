// tests/lib/unifi/firewall.test.ts
import { describe, it, expect } from 'vitest'
import {
  FirewallPolicySchema,
  FirewallPolicyResponseSchema,
} from '@/lib/unifi/types'

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