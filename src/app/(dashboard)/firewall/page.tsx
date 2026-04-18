// src/app/(dashboard)/firewall/page.tsx
import { verifySession } from '@/lib/dal'
import { getFirewallPolicies } from '@/lib/unifi/client'
import { FirewallList } from '@/components/firewall/firewall-list'

/**
 * Firewall page with firewall rules list
 * Per D-01: Firewall tab in main navigation
 * Per D-02: Route /firewall for firewall rules
 */
export default async function FirewallPage() {
  // Verify session (redirects to login if not authenticated)
  await verifySession()

  // Fetch initial data server-side (fast page load)
  const initialPolicies = await getFirewallPolicies()

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-zinc-100">
        Firewall Rules
      </h2>
      <FirewallList initialData={{ policies: initialPolicies, timestamp: Date.now() }} />
    </div>
  )
}