// tests/lib/unifi/schedule.test.ts
// Unit tests for Phase 11 schedule support:
//   - scheduleEndFromSchedule helper (via mock getFirewallPolicies)
//   - mock updateFirewallPolicy schedule param
//   - POST /api/firewall/schedule
//   - DELETE /api/firewall/schedule

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ────────────────────────────────────────────────────────────────────────────
// Group A & B: Direct mock module tests (no route mocking needed)
// ────────────────────────────────────────────────────────────────────────────

import {
  getFirewallPolicies as mockGetFirewallPolicies,
  updateFirewallPolicy as mockUpdateFirewallPolicy,
} from '@/lib/unifi/mock'

// ────────────────────────────────────────────────────────────────────────────
// Group C & D: Route handler tests
// These mock @/lib/unifi (the index facade) and @/lib/session
// ────────────────────────────────────────────────────────────────────────────

vi.mock('@/lib/unifi', () => ({
  getFirewallPolicies: vi.fn(),
  updateFirewallPolicy: vi.fn(),
}))

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

import { getFirewallPolicies, updateFirewallPolicy } from '@/lib/unifi'
import { getSession } from '@/lib/session'
import { POST, DELETE } from '@/app/api/firewall/schedule/route'

// ────────────────────────────────────────────────────────────────────────────
// Group A — scheduleEndFromSchedule (via mock getFirewallPolicies behavior)
// ────────────────────────────────────────────────────────────────────────────

describe('Group A — scheduleEnd derivation via mock module state', () => {
  // These tests mutate and restore mock module state. They work in isolation
  // because updateFirewallPolicy sets scheduleEnd from the schedule param
  // and getFirewallPolicies returns the stored value.

  it('A1: Policy with schedule.mode=ALWAYS → scheduleEnd is undefined after update', async () => {
    const policies = await mockGetFirewallPolicies()
    const target = policies[0]

    // Set ALWAYS schedule
    const updated = await mockUpdateFirewallPolicy(target._id, target.enabled, { mode: 'ALWAYS' })
    expect(updated.scheduleEnd).toBeUndefined()

    // Restore (no schedule param → scheduleEnd unchanged, but reset to clean state)
    await mockUpdateFirewallPolicy(target._id, target.enabled, { mode: 'ALWAYS' })
  })

  it('A2: Policy with ONE_TIME_ONLY schedule → scheduleEnd is correct Unix ms', async () => {
    const policies = await mockGetFirewallPolicies()
    const target = policies[0]

    const schedule = {
      mode: 'ONE_TIME_ONLY' as const,
      date: '2026-05-17',
      time_range_start: '14:00',
      time_range_end: '20:00',
    }

    const updated = await mockUpdateFirewallPolicy(target._id, target.enabled, schedule)

    // scheduleEnd should be the Unix ms for 2026-05-17T20:00 (local time)
    const expectedMs = new Date('2026-05-17T20:00').getTime()
    expect(updated.scheduleEnd).toBe(expectedMs)

    // Restore
    await mockUpdateFirewallPolicy(target._id, target.enabled, { mode: 'ALWAYS' })
  })

  it('A3: Policy with no schedule field via getFirewallPolicies → scheduleEnd is undefined', async () => {
    // Initial mock policies have no schedule set; scheduleEnd should be absent/undefined
    // Reset all policies to ALWAYS first to ensure clean state
    const policies = await mockGetFirewallPolicies()
    for (const p of policies) {
      await mockUpdateFirewallPolicy(p._id, p.enabled, { mode: 'ALWAYS' })
    }

    const fresh = await mockGetFirewallPolicies()
    for (const p of fresh) {
      // scheduleEnd is either undefined or absent
      expect(p.scheduleEnd).toBeUndefined()
    }
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Group B — mock updateFirewallPolicy schedule param
// ────────────────────────────────────────────────────────────────────────────

describe('Group B — mock updateFirewallPolicy with schedule param', () => {
  it('B1: Calling with ONE_TIME_ONLY schedule stores scheduleEnd on mock policy', async () => {
    const policies = await mockGetFirewallPolicies()
    const target = policies[0]

    const schedule = {
      mode: 'ONE_TIME_ONLY' as const,
      date: '2026-06-01',
      time_range_start: '10:00',
      time_range_end: '16:00',
    }

    const result = await mockUpdateFirewallPolicy(target._id, target.enabled, schedule)
    expect(result.scheduleEnd).toBe(new Date('2026-06-01T16:00').getTime())

    // Verify getFirewallPolicies reflects it
    const after = await mockGetFirewallPolicies()
    const found = after.find(p => p._id === target._id)
    expect(found?.scheduleEnd).toBe(new Date('2026-06-01T16:00').getTime())

    // Restore
    await mockUpdateFirewallPolicy(target._id, target.enabled, { mode: 'ALWAYS' })
  })

  it('B2: Calling with schedule={ mode: ALWAYS } clears scheduleEnd (sets to undefined)', async () => {
    const policies = await mockGetFirewallPolicies()
    const target = policies[0]

    // First set a ONE_TIME_ONLY schedule
    await mockUpdateFirewallPolicy(target._id, target.enabled, {
      mode: 'ONE_TIME_ONLY',
      date: '2026-06-01',
      time_range_start: '10:00',
      time_range_end: '16:00',
    })

    // Now clear it
    const result = await mockUpdateFirewallPolicy(target._id, target.enabled, { mode: 'ALWAYS' })
    expect(result.scheduleEnd).toBeUndefined()
  })

  it('B3: Calling without schedule param does not change existing scheduleEnd', async () => {
    const policies = await mockGetFirewallPolicies()
    const target = policies[1] // use a different policy to avoid interference

    // Set a ONE_TIME_ONLY schedule first
    const schedule = {
      mode: 'ONE_TIME_ONLY' as const,
      date: '2026-07-01',
      time_range_start: '09:00',
      time_range_end: '17:00',
    }
    await mockUpdateFirewallPolicy(target._id, target.enabled, schedule)
    const expectedMs = new Date('2026-07-01T17:00').getTime()

    // Call without schedule param — scheduleEnd should remain unchanged
    const result = await mockUpdateFirewallPolicy(target._id, !target.enabled)
    expect(result.scheduleEnd).toBe(expectedMs)

    // Restore
    await mockUpdateFirewallPolicy(target._id, target.enabled, { mode: 'ALWAYS' })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Group C — POST /api/firewall/schedule
// ────────────────────────────────────────────────────────────────────────────

describe('Group C — POST /api/firewall/schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('C1: Valid { policyId, durationHours: 2 } → 200 with scheduleEnd ~= now+2h', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })

    const now = Date.now()
    const expectedScheduleEnd = now + 2 * 60 * 60 * 1000

    vi.mocked(updateFirewallPolicy).mockResolvedValue({
      _id: 'policy-1',
      name: 'Block Gaming',
      enabled: true,
      scheduleEnd: expectedScheduleEnd,
    })

    const request = new Request('http://localhost/api/firewall/schedule', {
      method: 'POST',
      body: JSON.stringify({ policyId: 'policy-1', durationHours: 2 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data._id).toBe('policy-1')
    expect(data.enabled).toBe(true)
    // scheduleEnd should be within 60 seconds of now+2h
    expect(data.scheduleEnd).toBeGreaterThan(expectedScheduleEnd - 60_000)
    expect(data.scheduleEnd).toBeLessThan(expectedScheduleEnd + 60_000)
  })

  it('C1b: updateFirewallPolicy called with policyId=true and ONE_TIME_ONLY schedule', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(updateFirewallPolicy).mockResolvedValue({
      _id: 'policy-1',
      name: 'Block Gaming',
      enabled: true,
    })

    const request = new Request('http://localhost/api/firewall/schedule', {
      method: 'POST',
      body: JSON.stringify({ policyId: 'policy-1', durationHours: 2 }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(request)

    expect(vi.mocked(updateFirewallPolicy)).toHaveBeenCalledWith(
      'policy-1',
      true,
      expect.objectContaining({ mode: 'ONE_TIME_ONLY' })
    )
  })

  it('C2: Missing policyId → 400 VALIDATION_ERROR', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })

    const request = new Request('http://localhost/api/firewall/schedule', {
      method: 'POST',
      body: JSON.stringify({ durationHours: 2 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe('VALIDATION_ERROR')
  })

  it('C3: durationHours=0 → 400 VALIDATION_ERROR (min(1) constraint)', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })

    const request = new Request('http://localhost/api/firewall/schedule', {
      method: 'POST',
      body: JSON.stringify({ policyId: 'policy-1', durationHours: 0 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe('VALIDATION_ERROR')
  })

  it('C4: Unauthenticated → 401', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const request = new Request('http://localhost/api/firewall/schedule', {
      method: 'POST',
      body: JSON.stringify({ policyId: 'policy-1', durationHours: 2 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.error).toBe('UNAUTHORIZED')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Group D — DELETE /api/firewall/schedule
// ────────────────────────────────────────────────────────────────────────────

describe('Group D — DELETE /api/firewall/schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('D1: Valid { policyId } → 200, policy scheduleEnd is undefined', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })
    vi.mocked(getFirewallPolicies).mockResolvedValue([
      { _id: 'policy-1', name: 'Block Gaming', enabled: true, scheduleEnd: 1748000000000 },
    ])
    vi.mocked(updateFirewallPolicy).mockResolvedValue({
      _id: 'policy-1',
      name: 'Block Gaming',
      enabled: true,
      // scheduleEnd absent (ALWAYS schedule cleared it)
    })

    const request = new Request('http://localhost/api/firewall/schedule', {
      method: 'DELETE',
      body: JSON.stringify({ policyId: 'policy-1', enabled: true }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await DELETE(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data._id).toBe('policy-1')
    expect(data.scheduleEnd).toBeUndefined()

    // Verify called with ALWAYS schedule and existing enabled state
    expect(vi.mocked(updateFirewallPolicy)).toHaveBeenCalledWith(
      'policy-1',
      true,
      { mode: 'ALWAYS' }
    )
  })

  it('D2: Missing policyId → 400', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'admin', expiresAt: new Date(Date.now() + 86400000) })

    const request = new Request('http://localhost/api/firewall/schedule', {
      method: 'DELETE',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await DELETE(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe('VALIDATION_ERROR')
  })

  it('D3: Unauthenticated → 401', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const request = new Request('http://localhost/api/firewall/schedule', {
      method: 'DELETE',
      body: JSON.stringify({ policyId: 'policy-1', enabled: true }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await DELETE(request)
    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.error).toBe('UNAUTHORIZED')
  })
})
