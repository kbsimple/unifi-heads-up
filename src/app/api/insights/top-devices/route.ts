import 'server-only'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db'
import { queryTopDevices } from '@/lib/insights/queries'
import { getUnifiClients } from '@/lib/unifi/client'

const VALID_MINUTES = new Set([5, 30, 60, 10080, 20160, 43200])

/**
 * GET /api/insights/top-devices?minutes=5|30|60|10080|20160|43200
 * Returns up to 20 devices ranked by total bytes descending over the given period.
 *
 * Threat model T-10-01: session required
 * Threat model T-10-02: minutes validated to allowlist
 * Threat model T-10-04: minutes passed as parameterised binding
 */
export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.username) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const minutesParam = searchParams.get('minutes')
  const minutes = minutesParam !== null ? Number(minutesParam) : NaN

  if (!Number.isInteger(minutes) || !VALID_MINUTES.has(minutes)) {
    return NextResponse.json({ error: 'INVALID_MINUTES' }, { status: 400 })
  }

  try {
    const rows = queryTopDevices(getDb(), minutes)

    // Best-effort: enrich with display names from live UniFi clients.
    // Falls back to MAC if the API call fails (e.g. offline controller).
    let nameMap = new Map<string, string>()
    try {
      const { clients } = await getUnifiClients()
      for (const c of clients) {
        nameMap.set(c.mac, c.displayName)
      }
    } catch {
      // ignore — nameMap stays empty, chart falls back to MAC
    }

    const data = rows.map(r => ({
      ...r,
      displayName: nameMap.get(r.mac) ?? r.mac,
    }))

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'DB_ERROR', message }, { status: 500 })
  }
}
