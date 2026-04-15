// src/app/(dashboard)/page.tsx
import { verifySession } from '@/lib/dal'
import { getUnifiClients } from '@/lib/unifi/client'
import { ClientList } from '@/components/dashboard/client-list'

/**
 * Dashboard page with network clients list
 * Per DEVI-01: View all network clients with name, MAC, IP
 * Per DEVI-05: Auto-refresh every 60 seconds via SWR polling
 */
export default async function DashboardPage() {
  // Verify session (redirects to login if not authenticated)
  await verifySession()

  // Fetch initial data server-side (fast page load)
  const initialClients = await getUnifiClients()

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-zinc-100">
        Network Clients
      </h2>
      <ClientList initialData={initialClients} />
    </div>
  )
}