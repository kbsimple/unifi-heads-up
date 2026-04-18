// src/app/(dashboard)/groups/page.tsx
import { verifySession } from '@/lib/dal'
import { getUnifiClients } from '@/lib/unifi/client'
import { GroupList } from '@/components/groups/group-list'

/**
 * Groups page — view and manage device groups with traffic aggregation.
 * Per GRUP-01: Create groups with custom names.
 * Per GRUP-02: Add/remove devices from groups.
 * Per GTRA-01: Aggregated traffic status per group.
 */
export default async function GroupsPage() {
  // Verify session (redirects to login if not authenticated)
  await verifySession()

  // Fetch initial data server-side (fast page load)
  const initialClients = await getUnifiClients()

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-zinc-100">Device Groups</h2>
      <GroupList initialDevices={initialClients} />
    </div>
  )
}
