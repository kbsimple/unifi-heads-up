import { NextResponse } from 'next/server'
import 'server-only'

const startedAt = Date.now()

export async function GET() {
  return NextResponse.json({
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    buildId: process.env.NEXT_BUILD_ID ?? process.env.BUILD_ID ?? 'dev',
    nodeVersion: process.version,
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
  })
}
