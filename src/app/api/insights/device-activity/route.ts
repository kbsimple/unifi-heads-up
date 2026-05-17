import 'server-only'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db'
import { queryDeviceActivity } from '@/lib/insights/queries'

const VALID_DAYS = new Set([7, 14, 30])

/**
 * GET /api/insights/device-activity?mac=XX:XX:XX:XX:XX:XX&days=7|14|30
 * Returns exactly 24 hourly buckets for the given device over the given period.
 *
 * Threat model T-10-01: session required
 * Threat model T-10-02: days validated to allowlist
 * Threat model T-10-03: mac validated (non-empty); session required to prevent enumeration
 * Threat model T-10-04: mac and days passed as parameterised bindings
 */
export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.username) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const mac = searchParams.get('mac')
  const daysParam = searchParams.get('days')
  const days = daysParam !== null ? Number(daysParam) : NaN

  if (!mac || mac.trim() === '') {
    return NextResponse.json({ error: 'INVALID_MAC' }, { status: 400 })
  }

  if (!Number.isInteger(days) || !VALID_DAYS.has(days)) {
    return NextResponse.json({ error: 'INVALID_DAYS' }, { status: 400 })
  }

  try {
    const data = queryDeviceActivity(getDb(), mac, days)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'DB_ERROR', message }, { status: 500 })
  }
}
