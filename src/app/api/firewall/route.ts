// src/app/api/firewall/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { getFirewallPolicies, updateFirewallPolicy } from '@/lib/unifi/client'
import { ERROR_MESSAGES } from '@/lib/definitions'

/**
 * Schema for PUT request body validation
 * Per threat model T-03-01: Zod schema validation on policyId and enabled
 */
const ToggleRequestSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  enabled: z.boolean(),
})

/**
 * GET /api/firewall
 * Returns list of firewall policies from UniFi Site Manager
 *
 * Per threat model T-03-03: Requires session verification
 * Per FWRC-01: Returns policies array with timestamp
 */
export async function GET() {
  // Verify session (per threat model T-03-03)
  const session = await getSession()

  if (!session?.username) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 }
    )
  }

  try {
    const policies = await getFirewallPolicies()
    return NextResponse.json({
      policies,
      timestamp: Date.now(),
    })
  } catch (error) {
    // Structured error handling per Phase 1 pattern
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Distinguish between network errors and API errors
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
 * PUT /api/firewall
 * Toggles a firewall policy's enabled state
 *
 * Per threat model T-03-01: Zod schema validation on input
 * Per threat model T-03-03: Requires session verification
 * Per FWRC-02: Toggles policy and returns updated policy
 */
export async function PUT(request: Request) {
  // Verify session (per threat model T-03-03)
  const session = await getSession()

  if (!session?.username) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 }
    )
  }

  try {
    // Parse and validate request body (per threat model T-03-01)
    const body = await request.json()
    const result = ToggleRequestSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: result.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      )
    }

    const { policyId, enabled } = result.data
    const updatedPolicy = await updateFirewallPolicy(policyId, enabled)

    return NextResponse.json(updatedPolicy)
  } catch (error) {
    // Structured error handling per Phase 1 pattern
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Distinguish between network errors and API errors
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