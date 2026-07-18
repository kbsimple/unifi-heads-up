import 'server-only'
import { fetch, Agent } from 'undici'
import { getDb } from '@/lib/db/index'
import pkg from '../../package.json'

const unifiAgent = new Agent({ connect: { rejectUnauthorized: false } })

export interface DbHealth {
  ok: boolean
  latencyMs: number
}

export interface UnifiHealth {
  ok: boolean
  latencyMs: number
}

export interface AppVersion {
  version: string
  releaseDate: string
}

export async function checkDbHealth(): Promise<DbHealth> {
  const start = performance.now()
  try {
    const db = getDb()
    db.prepare('SELECT 1').get()
    return { ok: true, latencyMs: Math.round(performance.now() - start) }
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) }
  }
}

export async function checkUnifiProxy(): Promise<UnifiHealth> {
  const host = process.env.UNIFI_HOST
  if (!host) return { ok: false, latencyMs: 0 }

  const start = performance.now()
  try {
    const res = await fetch(`https://${host}/`, {
      dispatcher: unifiAgent,
      signal: AbortSignal.timeout(5000),
    })
    // Any HTTP response (including 401/403) means the console is reachable
    return { ok: res.status > 0, latencyMs: Math.round(performance.now() - start) }
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) }
  }
}

export function getAppVersion(): AppVersion {
  return {
    version: pkg.version,
    releaseDate: (pkg as { releaseDate?: string }).releaseDate ?? 'unknown',
  }
}
