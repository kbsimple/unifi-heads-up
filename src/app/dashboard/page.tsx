import { verifySession } from '@/lib/dal'
import { getUnifiClients } from '@/lib/unifi/client'
import { ClientList } from '@/components/dashboard/client-list'

export default async function DashboardPage() {
  await verifySession()

  let initialClients
  try {
    initialClients = await getUnifiClients()
  } catch {
    initialClients = { clients: [], timestamp: Date.now() }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-zinc-100">
        Network Clients
      </h2>
      <ClientList initialData={initialClients} />
    </div>
  )
}
