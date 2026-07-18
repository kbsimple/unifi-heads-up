import 'server-only'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db'
import { querySiteHistoryRecent, VALID_WINDOWS } from '@/lib/insights/queries'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.username) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const windowParam = searchParams.get('window')
  const windowMinutes = windowParam ? parseInt(windowParam, 10) : 1440

  if (!VALID_WINDOWS.includes(windowMinutes as typeof VALID_WINDOWS[number])) {
    return NextResponse.json({ error: 'INVALID_WINDOW' }, { status: 400 })
  }

  try {
    const data = querySiteHistoryRecent(getDb(), windowMinutes)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'DB_ERROR', message }, { status: 500 })
  }
}
