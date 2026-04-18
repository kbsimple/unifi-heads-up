'use client'

import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp, PlusCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrafficBadge } from '@/components/dashboard/traffic-badge'
import { DeviceChip } from './device-chip'
import type { DeviceGroup } from '@/hooks/use-groups'
import type { NetworkClient } from '@/lib/unifi/types'

interface GroupCardProps {
  group: DeviceGroup
  devices: NetworkClient[]
  onRemoveDevice: (groupId: string, deviceId: string) => void
  onDelete: (groupId: string) => void
  onAddDevices: (groupId: string) => void
}

/**
 * Computes the aggregated traffic status for a group of devices.
 * Per D-10: Sum downloadRate + uploadRate for all group devices.
 * Thresholds (bytes/s): High >1MB/s, Medium >100KB/s, Low >0, Idle =0
 */
function computeAggregatedStatus(
  devices: NetworkClient[]
): 'idle' | 'low' | 'medium' | 'high' {
  const totalBytes = devices.reduce(
    (sum, d) => sum + d.downloadRate + d.uploadRate,
    0
  )
  if (totalBytes > 1_000_000) return 'high'
  if (totalBytes > 100_000) return 'medium'
  if (totalBytes > 0) return 'low'
  return 'idle'
}

/**
 * Card component for a device group.
 * Per D-03: Card matching Phase 2/3 pattern.
 * Per D-06: Expandable section for device list.
 * Per D-07: Device chips with remove button.
 * Per D-10: Aggregated traffic status badge.
 * Per D-11: Per-device status visible in expanded view.
 * Per D-12: Empty state when no devices.
 */
export function GroupCard({
  group,
  devices,
  onRemoveDevice,
  onDelete,
  onAddDevices,
}: GroupCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Find devices belonging to this group
  const groupDevices = devices.filter((d) => group.deviceIds.includes(d.id))

  const aggregatedStatus = computeAggregatedStatus(groupDevices)

  return (
    <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          {/* Left: name + device count + expand toggle */}
          <button
            type="button"
            className="flex items-center gap-2 text-left"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            <span className="font-medium text-zinc-100">{group.name}</span>
            <span className="text-sm text-zinc-500">
              ({group.deviceIds.length})
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )}
          </button>

          {/* Right: aggregated badge + delete */}
          <div className="flex items-center gap-3">
            <TrafficBadge status={aggregatedStatus} />
            <button
              type="button"
              onClick={() => onDelete(group.id)}
              aria-label={`Delete ${group.name} group`}
              className="text-zinc-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Expandable device list */}
        {expanded && (
          <div className="mt-3 space-y-2">
            {groupDevices.length === 0 ? (
              <p className="text-sm text-zinc-500">No devices in this group</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {groupDevices.map((device) => (
                  <DeviceChip
                    key={device.id}
                    device={device}
                    onRemove={() => onRemoveDevice(group.id, device.id)}
                  />
                ))}
              </div>
            )}

            {/* Add devices button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAddDevices(group.id)}
              className="mt-1 text-zinc-400 hover:text-zinc-100"
            >
              <PlusCircle className="mr-1 h-4 w-4" />
              Add devices
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
