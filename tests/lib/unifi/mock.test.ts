// tests/lib/unifi/mock.test.ts
// Unit tests for src/lib/unifi/mock.ts
// Covers: MOCK-04 (policy count/mixed states), MOCK-05 (toggle mutation, not-found),
//         MOCK-06 (client count), MOCK-07 (status coverage), MOCK-08 (field validation)

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getUnifiClients,
  getFirewallPolicies,
  updateFirewallPolicy,
  isZoneBasedFirewallEnabled,
} from '@/lib/unifi/mock'

// NOTE: mock.ts uses module-level mutable state for mockPolicies.
// Tests that mutate toggle state must be self-contained: read current value,
// flip it, assert, then flip back — so that test order does not matter.
// (Threat T-05-04 mitigation)

describe('getUnifiClients', () => {
  it('returns at least 6 clients', async () => {
    const { clients } = await getUnifiClients()
    expect(clients.length).toBeGreaterThanOrEqual(6)
  })

  it('timestamp is a recent number', async () => {
    const before = Date.now()
    const { timestamp } = await getUnifiClients()
    const after = Date.now()
    expect(typeof timestamp).toBe('number')
    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })

  it('every client has required fields (displayName, mac, ip, downloadRate, uploadRate)', async () => {
    const { clients } = await getUnifiClients()
    for (const client of clients) {
      // displayName: non-empty string
      expect(typeof client.displayName).toBe('string')
      expect(client.displayName.length).toBeGreaterThan(0)

      // mac: non-empty string matching hex colon notation
      expect(typeof client.mac).toBe('string')
      expect(client.mac.length).toBeGreaterThan(0)
      expect(client.mac).toMatch(/^[0-9a-f:]+$/)

      // ip: non-null string (mock always provides an IP)
      expect(client.ip).not.toBeNull()

      // downloadRate and uploadRate: numbers >= 0
      expect(typeof client.downloadRate).toBe('number')
      expect(client.downloadRate).toBeGreaterThanOrEqual(0)
      expect(typeof client.uploadRate).toBe('number')
      expect(client.uploadRate).toBeGreaterThanOrEqual(0)
    }
  })

  it('clients cover all four traffic statuses (high, medium, low, idle)', async () => {
    const { clients } = await getUnifiClients()
    const statuses = new Set(clients.map(c => c.trafficStatus))
    expect(statuses.has('high')).toBe(true)
    expect(statuses.has('medium')).toBe(true)
    expect(statuses.has('low')).toBe(true)
    expect(statuses.has('idle')).toBe(true)
  })
})

describe('getFirewallPolicies', () => {
  it('returns at least 3 policies', async () => {
    const policies = await getFirewallPolicies()
    expect(policies.length).toBeGreaterThanOrEqual(3)
  })

  it('returns policies with mixed enabled states (at least one true, one false)', async () => {
    const policies = await getFirewallPolicies()
    const hasEnabled = policies.some(p => p.enabled === true)
    const hasDisabled = policies.some(p => p.enabled === false)
    expect(hasEnabled).toBe(true)
    expect(hasDisabled).toBe(true)
  })

  it('returns a shallow copy — mutations to returned array do not affect internal state', async () => {
    const first = await getFirewallPolicies()
    const originalLength = first.length
    // Mutate the returned array (push a fake item)
    first.push({ _id: 'injected', name: 'Injected', enabled: true })
    // Internal state must be unaffected
    const second = await getFirewallPolicies()
    expect(second.length).toBe(originalLength)
    expect(second.find(p => p._id === 'injected')).toBeUndefined()
  })
})

describe('updateFirewallPolicy', () => {
  it('toggles enabled state and returns the updated policy', async () => {
    const before = await getFirewallPolicies()
    const target = before[0]
    const flipped = !target.enabled

    const result = await updateFirewallPolicy(target._id, flipped)

    expect(result._id).toBe(target._id)
    expect(result.enabled).toBe(flipped)

    // Restore original state so other tests are not affected
    await updateFirewallPolicy(target._id, target.enabled)
  })

  it('subsequent getFirewallPolicies reflects the toggle', async () => {
    const before = await getFirewallPolicies()
    const target = before[0]
    const flipped = !target.enabled

    await updateFirewallPolicy(target._id, flipped)
    const after = await getFirewallPolicies()
    const found = after.find(p => p._id === target._id)

    expect(found).toBeDefined()
    expect(found!.enabled).toBe(flipped)

    // Restore original state
    await updateFirewallPolicy(target._id, target.enabled)
  })

  it('throws when policy ID not found', async () => {
    await expect(
      updateFirewallPolicy('nonexistent-id', true)
    ).rejects.toThrow(/not found/i)
  })
})

describe('isZoneBasedFirewallEnabled', () => {
  it('returns false', async () => {
    const result = await isZoneBasedFirewallEnabled()
    expect(result).toBe(false)
  })
})
