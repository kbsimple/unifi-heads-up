import { NextResponse } from 'next/server'
import 'server-only'
import { checkDbHealth, checkUnifiProxy, checkFirewallHealth, getAppVersion } from '@/lib/statusz'

export async function GET() {
  const [db, unifi, firewall] = await Promise.all([
    checkDbHealth(),
    checkUnifiProxy(),
    checkFirewallHealth(),
  ])
  const app = getAppVersion()

  return NextResponse.json({
    db: { ok: db.ok, latencyMs: db.latencyMs },
    unifi: { ok: unifi.ok, latencyMs: unifi.latencyMs },
    firewall: {
      isZBF: firewall.isZBF,
      policyCount: firewall.policyCount,
      zbfPolicies: firewall.zbfPolicies,
      legacyPolicies: firewall.legacyPolicies,
      ...(firewall.error ? { error: firewall.error } : {}),
    },
    app: { version: app.version, releaseDate: app.releaseDate },
  })
}
