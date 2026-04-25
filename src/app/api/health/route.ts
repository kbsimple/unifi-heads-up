// src/app/api/health/route.ts
// Unauthenticated healthcheck endpoint for Docker container health monitoring.
// Per D-09: returns { ok: true } with HTTP 200. No auth required — LAN-internal use only.
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: true })
}
