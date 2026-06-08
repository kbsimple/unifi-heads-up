// tests/lib/unifi/schedule-route.test.ts
// Route handler tests for Phase 11 schedule support
// These mock @/lib/unifi (the index facade) and @/lib/session

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))

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
// Group C — POST /api/firewall/schedule
// ────────────────────────────────────────────────────────────────────────────

describe('Group C — POST /api/firewall/schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock time to noon so duration doesn't cross midnight
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
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