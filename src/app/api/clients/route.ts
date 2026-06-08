// src/app/api/clients/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUnifiClients } from '@/lib/unifi'
import { getLatestClients, upsertLatestClients } from '@/lib/db'
import { ERROR_MESSAGES } from '@/lib/definitions'
import type { ClientsResponse } from '@/lib/unifi/types'

interface ClientsCacheResponse extends ClientsResponse {
  cacheStatus: 'hit' | 'stale' | 'miss'
}

// Max age for cache to be considered fresh (60 seconds, matching recorder interval)
const CACHE_FRESH_MS = 60_000

/**
 * GET /api/clients
 * Returns list of network clients with stale-while-revalidate caching.
 *
 * Cache behavior:
 * - Fresh (< 60s old): Return immediately from SQLite cache
 * - Stale (≥ 60s old): Return cached data, trigger background refresh
 * - Miss (no cache): Fetch from UniFi API, cache result, return
 *
 * Per threat model T-02-04: Requires session verification
 */
export async function GET(req: Request): Promise<Response> {
  // Verify session (per threat model T-02-04)
  const session = await getSession()

  if (!session?.username) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 }
    )
  }

  // Try to get cached data (considers max age)
  const cached = getLatestClients(CACHE_FRESH_MS)

  if (cached) {
    // Cache hit - return immediately
    return NextResponse.json<ClientsCacheResponse>({
      clients: cached.clients,
      timestamp: cached.timestamp,
      cacheStatus: 'hit',
    })
  }

  // Cache miss or stale - try to get stale data while fetching fresh
  const staleCache = getLatestClients(Infinity) // Get any cache regardless of age

  if (staleCache) {
    // Return stale data immediately, refresh in background
    refreshClientsCache()
    return NextResponse.json<ClientsCacheResponse>({
      clients: staleCache.clients,
      timestamp: staleCache.timestamp,
      cacheStatus: 'stale',
    })
  }

  // No cache at all - must fetch synchronously (first load after server start)
  try {
    const data = await getUnifiClients()
    // Cache the result for next request
    upsertLatestClients(data.clients)
    return NextResponse.json<ClientsCacheResponse>({
      clients: data.clients,
      timestamp: data.timestamp,
      cacheStatus: 'miss',
    })
  } catch (error) {
    return handleError(error, req.url)
  }
}

/**
 * Background refresh - updates cache without blocking response
 */
function refreshClientsCache(): void {
  getUnifiClients()
    .then((data) => {
      upsertLatestClients(data.clients)
    })
    .catch((err) => {
      console.error('[clients] background refresh failed:', err)
    })
}

/**
 * Error handler for API errors
 */
function handleError(error: unknown, path: string): Response {
  const message = error instanceof Error ? error.message : 'Unknown error'
  const stack = error instanceof Error ? error.stack : undefined

  // Distinguish between network errors and API errors (per UIUX-05)
  if (message.includes('fetch') || message.includes('network')) {
    return NextResponse.json(
      {
        error: 'NETWORK_ERROR',
        message: ERROR_MESSAGES.NETWORK_ERROR,
        path,
        details: { originalError: message, stack },
      },
      { status: 503 }
    )
  }

  return NextResponse.json(
    {
      error: 'API_ERROR',
      message: ERROR_MESSAGES.UNKNOWN,
      path,
      details: { originalError: message, stack },
    },
    { status: 500 }
  )
}