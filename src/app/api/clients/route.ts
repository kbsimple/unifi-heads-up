// src/app/api/clients/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUnifiClients } from '@/lib/unifi'
import { ERROR_MESSAGES } from '@/lib/definitions'

/**
 * GET /api/clients
 * Returns list of network clients from UniFi Site Manager
 *
 * Per threat model T-02-04: Requires session verification
 * Per UIUX-05: Returns structured error responses
 */
export async function GET() {
  // Verify session (per threat model T-02-04)
  const session = await getSession()

  if (!session?.username) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 }
    )
  }

  try {
    const data = await getUnifiClients()
    return NextResponse.json(data)
  } catch (error) {
    // Structured error handling per Phase 1 pattern
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Distinguish between network errors and API errors (per UIUX-05)
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