import 'server-only'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db'
import { queryDeviceHistory } from '@/lib/insights/queries'

const HISTORY_HOURS = 24

export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.username) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const mac = searchParams.get('mac')

  if (!mac || mac.trim() === '') {
    return NextResponse.json({ error: 'INVALID_MAC' }, { status: 400 })
  }

  try {
    const data = queryDeviceHistory(getDb(), mac, HISTORY_HOURS)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'DB_ERROR', message }, { status: 500 })
  }
}
