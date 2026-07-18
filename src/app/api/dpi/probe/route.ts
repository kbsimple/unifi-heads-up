import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { probeDpi, probeDpiMock } from '@/lib/dpi/probe'

export async function GET(request: Request) {
  // Auth gate — middleware excludes /api/** so we check session here
  const session = await getSession()
  if (!session?.username) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const mac = searchParams.get('mac')
  if (!mac) {
    return NextResponse.json({ error: 'mac query param required' }, { status: 400 })
  }

  // Mock mode — check env inline (not via facade) since probe is standalone
  if (process.env.UNIFI_MOCK === 'true') {
    return NextResponse.json(probeDpiMock([mac]))
  }

  const result = await probeDpi([mac])
  return NextResponse.json(result)
}
