import { verifySession } from '@/lib/dal'
import { getUnifiClients } from '@/lib/unifi'
import { getDb } from '@/lib/db'
import { queryAllLastBusy } from '@/lib/insights/queries'
import { ClientList } from '@/components/dashboard/client-list'

export default async function DashboardPage() {
  await verifySession()

  let initialClients
  try {
    const result = await getUnifiClients()
    const lastBusyMap = queryAllLastBusy(getDb())
    initialClients = {
      ...result,
      clients: result.clients.map((c) => ({ ...c, lastBusy: lastBusyMap[c.mac] ?? null })),
    }
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
