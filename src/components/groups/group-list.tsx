'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { FolderPlus } from 'lucide-react'
import { GroupCard } from './group-card'
import { CreateGroupModal } from './create-group-modal'
import { AddDevicesModal } from './add-devices-modal'
import { useGroups } from '@/hooks/use-groups'
import type { ClientsResponse, NetworkClient } from '@/lib/unifi/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface GroupListProps {
  initialDevices: ClientsResponse
}

/**
 * Client component that renders all groups with management controls.
 * Per D-03: Group card display.
 * Per GRUP-01 through GRUP-04: Full CRUD for device groups.
 */
export function GroupList({ initialDevices }: GroupListProps) {
  const { data } = useSWR<ClientsResponse>('/api/clients', fetcher, {
    fallbackData: initialDevices,
    refreshInterval: 60000,
    revalidateOnFocus: true,
  })

  const { groups, createGroup, addGroupDevice, removeGroupDevice, deleteGroup } =
    useGroups()

  // Track which group is open for adding more devices
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null)

  const devices: NetworkClient[] = data?.clients ?? []

  function handleGroupCreated(name: string, deviceIds: string[]) {
    const newGroupId = createGroup(name)
    deviceIds.forEach((deviceId) => addGroupDevice(newGroupId, deviceId))
  }

  function handleAddDevicesToGroup(groupId: string, deviceIds: string[]) {
    deviceIds.forEach((deviceId) => addGroupDevice(groupId, deviceId))
    setAddingToGroupId(null)
  }

  return (
    <div className="space-y-4">
      {/* Create group trigger */}
      <div className="flex items-center justify-between">
        <CreateGroupModal devices={devices} onGroupCreated={handleGroupCreated} />
      </div>

      {/* Add devices modal for existing group */}
      {addingToGroupId && (
        <AddDevicesModal
          groupId={addingToGroupId}
          allDevices={devices}
          currentGroupDeviceIds={
            groups.find((g) => g.id === addingToGroupId)?.deviceIds ?? []
          }
          onDevicesAdded={handleAddDevicesToGroup}
          onClose={() => setAddingToGroupId(null)}
        />
      )}

      {/* Empty state */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <FolderPlus className="h-12 w-12 text-zinc-600" />
          <h3 className="text-lg font-medium text-zinc-300">
            No groups created yet
          </h3>
          <p className="text-sm text-zinc-500 max-w-xs">
            Create your first group to organize and monitor devices together.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              devices={devices}
              onRemoveDevice={removeGroupDevice}
              onDelete={deleteGroup}
              onAddDevices={(groupId) => setAddingToGroupId(groupId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
