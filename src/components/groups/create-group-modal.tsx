'use client'

import { useState } from 'react'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import type { NetworkClient } from '@/lib/unifi/types'

/**
 * Per T-04-03: Validate group name — max 50 chars, alphanumeric + spaces + hyphens only.
 */
const groupNameSchema = z
  .string()
  .min(1, 'Group name is required')
  .max(50, 'Group name must be 50 characters or fewer')
  .regex(
    /^[a-zA-Z0-9 -]+$/,
    'Group name may only contain letters, numbers, spaces, and hyphens'
  )

interface CreateGroupModalProps {
  devices: NetworkClient[]
  onGroupCreated: (name: string, deviceIds: string[]) => void
}

/**
 * Modal for creating a new device group.
 * Per D-04: Group creation dialog with name input.
 * Per D-05: Checkbox device selection.
 * Per T-04-03: Validates group name before creation.
 */
export function CreateGroupModal({ devices, onGroupCreated }: CreateGroupModalProps) {
  const [open, setOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])
  const [nameError, setNameError] = useState<string | null>(null)

  function handleToggleDevice(deviceId: string, checked: boolean) {
    setSelectedDeviceIds((prev) =>
      checked ? [...prev, deviceId] : prev.filter((id) => id !== deviceId)
    )
  }

  function handleCreate() {
    // Validate group name per T-04-03
    const result = groupNameSchema.safeParse(groupName)
    if (!result.success) {
      setNameError(result.error.issues[0].message)
      return
    }

    onGroupCreated(result.data, selectedDeviceIds)

    // Reset and close
    setGroupName('')
    setSelectedDeviceIds([])
    setNameError(null)
    setOpen(false)
  }

  function handleCancel() {
    setGroupName('')
    setSelectedDeviceIds([])
    setNameError(null)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
      <DialogTrigger
        render={
          <Button variant="outline" />
        }
      >
        Create Group
      </DialogTrigger>

      <DialogContent
        className="bg-zinc-900 border-zinc-800"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Create Device Group</DialogTitle>
          <DialogDescription>
            Enter a name and select devices to add to this group.
          </DialogDescription>
        </DialogHeader>

        {/* Group name input */}
        <div className="space-y-1">
          <label
            htmlFor="group-name-input"
            className="text-sm font-medium text-zinc-200"
          >
            Group Name
          </label>
          <Input
            id="group-name-input"
            type="text"
            placeholder="e.g. Kids Devices"
            value={groupName}
            onChange={(e) => {
              setGroupName(e.target.value)
              setNameError(null)
            }}
            maxLength={50}
            aria-invalid={nameError != null}
            aria-describedby={nameError ? 'group-name-error' : undefined}
          />
          {nameError && (
            <p id="group-name-error" className="text-xs text-red-400">
              {nameError}
            </p>
          )}
        </div>

        {/* Device selection */}
        {devices.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-200">Select Devices</p>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {devices.map((device) => (
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
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-sky-600 hover:bg-sky-500 text-white border-0"
            onClick={handleCreate}
          >
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
