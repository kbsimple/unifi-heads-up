import { verifySession } from '@/lib/dal'
import { getUnifiClients } from '@/lib/unifi/client'
import { GroupList } from '@/components/groups/group-list'

export default async function GroupsPage() {
  await verifySession()

  let initialClients
  try {
    initialClients = await getUnifiClients()
  } catch {
    initialClients = { clients: [], timestamp: Date.now() }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-zinc-100">Device Groups</h2>
      <GroupList initialDevices={initialClients} />
    </div>
  )
}
