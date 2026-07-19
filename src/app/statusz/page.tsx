import { checkDbHealth, checkUnifiProxy, checkFirewallHealth, getAppVersion } from '@/lib/statusz'

export const dynamic = 'force-dynamic'

function Indicator({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}
      aria-label={ok ? 'OK' : 'Error'}
    />
  )
}

function Row({ label, indicator, detail }: { label: string; indicator: boolean; detail: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-800 last:border-0">
      <Indicator ok={indicator} />
      <span className="text-zinc-100 font-medium w-36 shrink-0">{label}</span>
      <span className="text-zinc-400 text-sm">{detail}</span>
    </div>
  )
}

export default async function StatuszPage() {
  const [db, unifi, firewall] = await Promise.all([
    checkDbHealth(),
    checkUnifiProxy(),
    checkFirewallHealth(),
  ])
  const app = getAppVersion()

  const firewallModeDetail = firewall.error
    ? `Error: ${firewall.error}`
    : firewall.isZBF ? 'Zone-Based Firewall' : 'Legacy policies'

  const firewallMatchDetail = firewall.error
    ? '—'
    : `${firewall.policyCount} total · ${firewall.zbfPolicies} ZBF (source.client_macs) · ${firewall.legacyPolicies} legacy (srcMac)`

  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-xl font-semibold text-zinc-100 mb-1">System Status</h1>
        <p className="text-zinc-500 text-sm mb-6">No authentication required</p>

        <div className="bg-zinc-900 rounded-lg border border-zinc-800 px-4 mb-4">
          <Row
            label="Database"
            indicator={db.ok}
            detail={db.ok ? `OK — ${db.latencyMs}ms` : 'Unavailable'}
          />
          <Row
            label="UniFi Proxy"
            indicator={unifi.ok}
            detail={unifi.ok ? `Reachable — ${unifi.latencyMs}ms` : 'Unreachable'}
          />
          <Row
            label="Version"
            indicator={true}
            detail={app.version}
          />
          <Row
            label="Release Date"
            indicator={true}
            detail={app.releaseDate}
          />
        </div>

        <h2 className="text-sm font-medium text-zinc-400 mb-2 px-1">Firewall</h2>
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 px-4">
          <Row
            label="Mode"
            indicator={!firewall.error}
            detail={firewallModeDetail}
          />
          <Row
            label="Policies"
            indicator={!firewall.error && firewall.policyCount > 0}
            detail={firewallMatchDetail}
          />
          {!firewall.error && firewall.isZBF && firewall.zbfPolicies === 0 && (
            <div className="py-3 text-xs text-amber-400">
              ⚠ ZBF mode detected but no policies have source.client_macs — device rules will not match
            </div>
          )}
          {!firewall.error && !firewall.isZBF && firewall.zbfPolicies > 0 && (
            <div className="py-3 text-xs text-amber-400">
              ⚠ Legacy mode detected but {firewall.zbfPolicies} policies use source.client_macs — device rules will not match
            </div>
          )}
        </div>

        <p className="text-zinc-600 text-xs mt-4 text-center">
          <a href="/dashboard" className="hover:text-zinc-400 transition-colors">← Dashboard</a>
        </p>
      </div>
    </div>
  )
}
