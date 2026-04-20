// tests/lib/unifi/index.test.ts
// Smoke test for the index.ts facade (MOCK-01, MOCK-02).
//
// NOTE: Testing the UNIFI_MOCK=true branch would require process.env manipulation
// across module reloads (vi.resetModules + dynamic import), which is complex in
// Vitest and adds fragility. The real switching behaviour is exercised end-to-end
// via dev.sh. This test verifies that when UNIFI_MOCK is not 'true' (default in
// test env), the facade exports the four expected callable functions.
//
// Threat T-05-05 mitigation: vi.mock('server-only') and vi.mock('@/lib/unifi/client')
// are declared before any imports so Vitest intercepts them before module execution,
// preventing ky and real env-var access from running in the test environment.

import { describe, it, expect, vi } from 'vitest'

// Must be declared before the import of @/lib/unifi to intercept module resolution
vi.mock('server-only', () => ({}))
vi.mock('@/lib/unifi/client', () => ({
  getUnifiClients: vi.fn().mockResolvedValue({ clients: [], timestamp: 0 }),
  getFirewallPolicies: vi.fn().mockResolvedValue([]),
  updateFirewallPolicy: vi.fn().mockResolvedValue({}),
  isZoneBasedFirewallEnabled: vi.fn().mockResolvedValue(false),
}))
vi.mock('@/lib/unifi/mock', () => ({
  getUnifiClients: vi.fn().mockResolvedValue({ clients: [], timestamp: 0 }),
  getFirewallPolicies: vi.fn().mockResolvedValue([]),
  updateFirewallPolicy: vi.fn().mockResolvedValue({}),
  isZoneBasedFirewallEnabled: vi.fn().mockResolvedValue(false),
}))

import {
  getUnifiClients,
  getFirewallPolicies,
  updateFirewallPolicy,
  isZoneBasedFirewallEnabled,
} from '@/lib/unifi'

describe('index facade', () => {
  it('exports getUnifiClients, getFirewallPolicies, updateFirewallPolicy, isZoneBasedFirewallEnabled as functions', () => {
    expect(typeof getUnifiClients).toBe('function')
    expect(typeof getFirewallPolicies).toBe('function')
    expect(typeof updateFirewallPolicy).toBe('function')
    expect(typeof isZoneBasedFirewallEnabled).toBe('function')
  })

  it('getUnifiClients is callable and returns a promise', async () => {
    const result = await getUnifiClients()
    expect(result).toHaveProperty('clients')
    expect(result).toHaveProperty('timestamp')
  })

  it('getFirewallPolicies is callable and returns a promise resolving to an array', async () => {
    const result = await getFirewallPolicies()
    expect(Array.isArray(result)).toBe(true)
  })

  it('isZoneBasedFirewallEnabled is callable and returns a promise', async () => {
    const result = await isZoneBasedFirewallEnabled()
    expect(typeof result).toBe('boolean')
  })
})
