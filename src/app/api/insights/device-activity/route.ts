import 'server-only'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db'
import { queryDeviceActivity } from '@/lib/insights/queries'

const VALID_MINUTES = new Set([5, 30, 60, 10080, 20160, 43200])

/**
 * GET /api/insights/device-activity?mac=XX:XX:XX:XX:XX:XX&minutes=5|30|60|10080|20160|43200
 * Returns exactly 24 hourly buckets for the given device over the given period.
 *
 * Threat model T-10-01: session required
 * Threat model T-10-02: minutes validated to allowlist
 * Threat model T-10-03: mac validated (non-empty); session required to prevent enumeration
 * Threat model T-10-04: mac and minutes passed as parameterised bindings
 */
export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.username) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const mac = searchParams.get('mac')
  const minutesParam = searchParams.get('minutes')
  const minutes = minutesParam !== null ? Number(minutesParam) : NaN

  if (!mac || mac.trim() === '') {
    return NextResponse.json({ error: 'INVALID_MAC' }, { status: 400 })
  }

  if (!Number.isInteger(minutes) || !VALID_MINUTES.has(minutes)) {
    return NextResponse.json({ error: 'INVALID_MINUTES' }, { status: 400 })
  }

  try {
    const data = queryDeviceActivity(getDb(), mac, minutes)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'DB_ERROR', message }, { status: 500 })
  }
}
