'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { TopDevicesChart } from './top-devices-chart'
import { DeviceActivityHeatmap } from './device-activity-heatmap'
import type { TopDevice } from './top-devices-chart'
import type { HourlyBucket } from './device-activity-heatmap'

type Minutes = 5 | 30 | 60 | 10080 | 20160 | 43200

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TIME_OPTIONS: { label: string; value: Minutes; group: 'short' | 'long' }[] = [
  { label: '5 min', value: 5, group: 'short' },
  { label: '30 min', value: 30, group: 'short' },
  { label: '1 hr', value: 60, group: 'short' },
  { label: '7 days', value: 10080, group: 'long' },
  { label: '14 days', value: 20160, group: 'long' },
  { label: '30 days', value: 43200, group: 'long' },
]

export function InsightsShell() {
  const [minutes, setMinutes] = useState<Minutes>(10080)
  const [selectedMac, setSelectedMac] = useState<string | null>(null)

  const { data: topDevices, isLoading: topLoading } = useSWR<TopDevice[]>(
    `/api/insights/top-devices?minutes=${minutes}`,
    fetcher,
    { refreshInterval: 0 }
  )

  // Auto-select first device when top devices load (or minutes changes)
  useEffect(() => {
    if (topDevices && topDevices.length > 0 && selectedMac === null) {
      setSelectedMac(topDevices[0].mac)
    }
  }, [topDevices, selectedMac])

  const { data: activityData, isLoading: activityLoading } = useSWR<HourlyBucket[]>(
    selectedMac
      ? `/api/insights/device-activity?mac=${encodeURIComponent(selectedMac)}&minutes=${minutes}`
      : null,
    fetcher,
    { refreshInterval: 0 }
  )

  function handleMinutesChange(newMinutes: Minutes) {
    setMinutes(newMinutes)
    setSelectedMac(null) // reset; auto-select will pick new top device
  }

  function handleSelectDevice(mac: string) {
    setSelectedMac(mac)
  }

  return (
    <div className="space-y-8">
      {/* Time range tabs */}
      <div className="bg-zinc-800 rounded-lg p-1 flex w-fit gap-0.5 items-center">
        {TIME_OPTIONS.map(({ label, value, group }, idx) => {
          const prev = TIME_OPTIONS[idx - 1]
          const showSep = idx > 0 && prev.group !== group
          return (
            <div key={value} className="flex items-center gap-0.5">
              {showSep && <div className="w-px h-5 bg-zinc-600 mx-1" />}
              <button
                onClick={() => handleMinutesChange(value)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  minutes === value
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            </div>
          )
        })}
      </div>

      {/* Top Devices section */}
      <section aria-label="Top Devices">
        <h2 className="text-lg font-medium text-zinc-200 mb-4">Top Devices</h2>
        <TopDevicesChart
          data={topDevices}
          isLoading={topLoading}
          selectedMac={selectedMac}
          onSelectDevice={handleSelectDevice}
        />
      </section>

      {/* Device Activity section */}
      <section aria-label="Device Activity">
        <h2 className="text-lg font-medium text-zinc-200 mb-4">Device Activity</h2>
        <DeviceActivityHeatmap
          data={activityData}
          isLoading={activityLoading}
          selectedMac={selectedMac}
          allDevices={topDevices ?? []}
          onSelectDevice={handleSelectDevice}
        />
      </section>
    </div>
  )
}
