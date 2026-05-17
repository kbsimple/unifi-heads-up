// src/app/api/firewall/schedule/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { getFirewallPolicies, updateFirewallPolicy } from '@/lib/unifi'
import { ERROR_MESSAGES } from '@/lib/definitions'
import type { UnifiSchedule } from '@/lib/unifi/types'

/**
 * Schema for POST request body
 * Per threat model T-11-01: Zod enforces int, min(1), max(24) on durationHours
 * Per threat model T-11-02: Zod enforces min(1) on policyId
 */
const ScheduleRequestSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  durationHours: z.number().int().min(1).max(24),
})

/**
 * Schema for DELETE request body
 * Per threat model T-11-02: Zod enforces min(1) on policyId
 */
const ClearScheduleRequestSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
})

/**
 * POST /api/firewall/schedule
 * Sets a ONE_TIME_ONLY schedule on a firewall policy for the given duration.
 * Enables the policy and writes the schedule in a single PUT to UniFi.
 *
 * Per threat model T-11-03: Requires session
 * Per threat model T-11-01: durationHours validated by Zod (int, 1–24)
 */
export async function POST(request: Request) {
  // Per threat model T-11-03: Require session before any UniFi call
  const session = await getSession()

  if (!session?.username) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const result = ScheduleRequestSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: result.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      )
    }

    const { policyId, durationHours } = result.data

    // Compute schedule window: now → now + durationHours
    const now = new Date()
    const end = new Date(now.getTime() + durationHours * 60 * 60 * 1000)
    const date = now.toISOString().slice(0, 10) // "YYYY-MM-DD"
    const start = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    // Clamp to 23:59 if end crosses midnight
    const endHour = end.getDate() !== now.getDate() ? 23 : end.getHours()
    const endMin = end.getDate() !== now.getDate() ? 59 : end.getMinutes()
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`

    const schedule: UnifiSchedule = {
      mode: 'ONE_TIME_ONLY',
      date,
      time_range_start: start,
      time_range_end: endTime,
    }

    // Enable the policy and set schedule in one PUT
    const updatedPolicy = await updateFirewallPolicy(policyId, true, schedule)

    return NextResponse.json(updatedPolicy)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('fetch') || message.includes('network')) {
      return NextResponse.json(
        { error: 'NETWORK_ERROR', message: ERROR_MESSAGES.NETWORK_ERROR },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'API_ERROR', message: ERROR_MESSAGES.UNKNOWN },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/firewall/schedule
 * Clears the schedule on a firewall policy by writing { mode: 'ALWAYS' }.
 * Preserves the current enabled state.
 *
 * Per threat model T-11-03: Requires session
 * Per threat model T-11-02: policyId validated by Zod
 */
export async function DELETE(request: Request) {
  // Per threat model T-11-03: Require session before any UniFi call
  const session = await getSession()

  if (!session?.username) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const result = ClearScheduleRequestSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: result.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      )
    }

    const { policyId } = result.data

    // GET current policies to find existing enabled state
    const policies = await getFirewallPolicies()
    const policy = policies.find(p => p._id === policyId)

    if (!policy) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Policy not found' },
        { status: 404 }
      )
    }

    // Write ALWAYS schedule to clear the schedule, preserve enabled state
    const updatedPolicy = await updateFirewallPolicy(policyId, policy.enabled, { mode: 'ALWAYS' })

    return NextResponse.json(updatedPolicy)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('fetch') || message.includes('network')) {
      return NextResponse.json(
        { error: 'NETWORK_ERROR', message: ERROR_MESSAGES.NETWORK_ERROR },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'API_ERROR', message: ERROR_MESSAGES.UNKNOWN },
      { status: 500 }
    )
  }
}
