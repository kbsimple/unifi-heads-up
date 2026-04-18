'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { NetworkClient } from '@/lib/unifi/types'

interface AddDevicesModalProps {
  groupId: string
  allDevices: NetworkClient[]
  currentGroupDeviceIds: string[]
  onDevicesAdded: (groupId: string, deviceIds: string[]) => void
  onClose: () => void
}

/**
 * Modal for adding devices to an existing group.
 * Shows only devices not already in the group.
 */
export function AddDevicesModal({
  groupId,
  allDevices,
  currentGroupDeviceIds,
  onDevicesAdded,
  onClose,
}: AddDevicesModalProps) {
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])

  // Devices not already in the group
  const availableDevices = allDevices.filter(
    (d) => !currentGroupDeviceIds.includes(d.id)
  )

  function handleToggleDevice(deviceId: string, checked: boolean) {
    setSelectedDeviceIds((prev) =>
      checked ? [...prev, deviceId] : prev.filter((id) => id !== deviceId)
    )
  }

  function handleAdd() {
    onDevicesAdded(groupId, selectedDeviceIds)
  }

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="bg-zinc-900 border-zinc-800" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add Devices to Group</DialogTitle>
          <DialogDescription>
            Select devices to add to this group.
          </DialogDescription>
        </DialogHeader>

        {availableDevices.length === 0 ? (
          <p className="text-sm text-zinc-500">
            All devices are already in this group.
          </p>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {availableDevices.map((device) => (
              <label
                key={device.id}
                className="flex items-center gap-2 cursor-pointer"
                aria-label={device.displayName}
              >
                <Checkbox
                  checked={selectedDeviceIds.includes(device.id)}
                  onCheckedChange={(checked) =>
                    handleToggleDevice(device.id, checked === true)
                  }
                />
                <span className="text-sm text-zinc-300">{device.displayName}</span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-sky-600 hover:bg-sky-500 text-white border-0"
            onClick={handleAdd}
            disabled={selectedDeviceIds.length === 0}
          >
            Add Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
