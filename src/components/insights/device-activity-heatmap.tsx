'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { TopDevice } from './top-devices-chart'

export interface HourlyBucket {
  hour: number     // 0-23
  avgMbps: number
  active: boolean
}

interface DeviceActivityHeatmapProps {
  data: HourlyBucket[] | undefined
  isLoading: boolean
  selectedMac: string | null
  allDevices: TopDevice[]
  onSelectDevice: (mac: string) => void
}

function shortMac(mac: string): string {
  return mac.slice(-8)
}

function cellColor(avgMbps: number): string {
  if (avgMbps === 0) return 'bg-zinc-800'
  if (avgMbps < 0.5) return 'bg-zinc-700'
  if (avgMbps < 5) return 'bg-sky-900'
  if (avgMbps < 25) return 'bg-sky-700'
  return 'bg-sky-500'
}

const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21]

const LEGEND = [
  { label: 'Idle', color: 'bg-zinc-800' },
  { label: 'Low', color: 'bg-zinc-700' },
  { label: 'Active', color: 'bg-sky-900' },
  { label: 'High', color: 'bg-sky-700' },
  { label: 'Peak', color: 'bg-sky-500' },
]

export function DeviceActivityHeatmap({
  data,
  isLoading,
  selectedMac,
  allDevices,
  onSelectDevice,
}: DeviceActivityHeatmapProps) {
  const showSkeleton = isLoading || !selectedMac || !data

  return (
    <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
      <CardContent className="p-4 space-y-4">
        {/* Header: label + device selector */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-400">
            {selectedMac ? `Showing: ${shortMac(selectedMac)}` : 'Select a device'}
          </span>
          {allDevices.length > 0 && (
            <select
              value={selectedMac ?? ''}
              onChange={e => onSelectDevice(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              {!selectedMac && (
                <option value="" disabled>
                  Select device…
                </option>
              )}
              {allDevices.map(d => (
                <option key={d.mac} value={d.mac}>
                  {shortMac(d.mac)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Heatmap or skeleton */}
        {showSkeleton ? (
          <Skeleton className="h-48 w-full rounded-lg bg-zinc-800" />
        ) : (
          <>
            {/* 24-column grid — using inline style because Tailwind v4 has no grid-cols-24 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(24, minmax(0, 1fr))',
                gap: '4px',
              }}
            >
              {data!.map(bucket => (
                <div
                  key={bucket.hour}
                  className={`h-10 w-full rounded ${cellColor(bucket.avgMbps)}`}
                  title={`${bucket.hour}:00 — ${bucket.avgMbps.toFixed(2)} Mbps`}
                />
              ))}
            </div>

            {/* Hour labels */}
            <div className="flex justify-between px-0">
              {HOUR_LABELS.map(h => (
                <span key={h} className="text-xs text-zinc-500">
                  {h}
                </span>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 flex-wrap">
              {LEGEND.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`inline-block w-3 h-3 rounded-sm ${color}`} />
                  <span className="text-xs text-zinc-500">{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
