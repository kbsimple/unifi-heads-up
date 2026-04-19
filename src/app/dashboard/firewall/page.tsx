import { verifySession } from '@/lib/dal'
import { getFirewallPolicies } from '@/lib/unifi/client'
import { FirewallList } from '@/components/firewall/firewall-list'

export default async function FirewallPage() {
  await verifySession()

  let initialPolicies
  try {
    initialPolicies = await getFirewallPolicies()
  } catch {
    initialPolicies = []
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-zinc-100">
        Firewall Rules
      </h2>
      <FirewallList initialData={{ policies: initialPolicies, timestamp: Date.now() }} />
    </div>
  )
}
