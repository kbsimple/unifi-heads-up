import { NextResponse } from 'next/server'
import 'server-only'
import { checkDbHealth, checkUnifiProxy, getAppVersion } from '@/lib/statusz'

export async function GET() {
  const [db, unifi] = await Promise.all([checkDbHealth(), checkUnifiProxy()])
  const app = getAppVersion()

  return NextResponse.json({
    db: { ok: db.ok, latencyMs: db.latencyMs },
    unifi: { ok: unifi.ok, latencyMs: unifi.latencyMs },
    app: { version: app.version, releaseDate: app.releaseDate },
  })
}
