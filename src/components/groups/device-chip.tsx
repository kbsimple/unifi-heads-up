'use client'

import { X } from 'lucide-react'
import { TrafficBadge } from '@/components/dashboard/traffic-badge'
import type { NetworkClient } from '@/lib/unifi/types'

interface DeviceChipProps {
  device: NetworkClient
  onRemove: () => void
}

/**
 * Device pill component for group card expanded view.
 * Per D-07: Device pill with name, traffic badge, and remove button.
 */
export function DeviceChip({ device, onRemove }: DeviceChipProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1">
      <span className="text-sm text-zinc-100">{device.displayName}</span>
      <TrafficBadge status={device.trafficStatus} />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${device.displayName} from group`}
        className="text-zinc-500 hover:text-red-400 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
