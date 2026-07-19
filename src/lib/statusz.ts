import 'server-only'
import { fetch, Agent } from 'undici'
import { getDb } from '@/lib/db/index'
import { getFirewallPolicies, isZoneBasedFirewallEnabled } from '@/lib/unifi'
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

export interface FirewallHealth {
  isZBF: boolean
  policyCount: number
  zbfPolicies: number
  legacyPolicies: number
  error?: string
}

export async function checkFirewallHealth(): Promise<FirewallHealth> {
  try {
    const [isZBF, policies] = await Promise.all([
      isZoneBasedFirewallEnabled(),
      getFirewallPolicies(),
    ])

    let zbfPolicies = 0
    let legacyPolicies = 0
    for (const p of policies) {
      const raw = p as Record<string, unknown>
      const srcMacs = (raw.source as Record<string, unknown> | undefined)?.client_macs
      const dstMacs = (raw.destination as Record<string, unknown> | undefined)?.client_macs
      const hasZBFMacs = Array.isArray(srcMacs) || Array.isArray(dstMacs)
      const hasLegacyMac = typeof raw.srcMac === 'string' || typeof raw.srcAddress === 'string'
      if (hasZBFMacs) zbfPolicies++
      if (hasLegacyMac) legacyPolicies++
    }

    return { isZBF, policyCount: policies.length, zbfPolicies, legacyPolicies }
  } catch (err) {
    return {
      isZBF: false,
      policyCount: 0,
      zbfPolicies: 0,
      legacyPolicies: 0,
      error: err instanceof Error ? err.message : 'unknown',
    }
  }
}
