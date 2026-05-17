'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { TopDevicesChart } from './top-devices-chart'
import { DeviceActivityHeatmap } from './device-activity-heatmap'
import type { TopDevice } from './top-devices-chart'
import type { HourlyBucket } from './device-activity-heatmap'

type Days = 7 | 14 | 30

const fetcher = (url: string) => fetch(url).then(r => r.json())

const DAY_OPTIONS: { label: string; value: Days }[] = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
]

export function InsightsShell() {
  const [days, setDays] = useState<Days>(7)
  const [selectedMac, setSelectedMac] = useState<string | null>(null)

  const { data: topDevices, isLoading: topLoading } = useSWR<TopDevice[]>(
    `/api/insights/top-devices?days=${days}`,
    fetcher,
    { refreshInterval: 0 }
  )

  // Auto-select first device when top devices load (or days changes)
  useEffect(() => {
    if (topDevices && topDevices.length > 0 && selectedMac === null) {
      setSelectedMac(topDevices[0].mac)
    }
  }, [topDevices, selectedMac])

  const { data: activityData, isLoading: activityLoading } = useSWR<HourlyBucket[]>(
    selectedMac
      ? `/api/insights/device-activity?mac=${encodeURIComponent(selectedMac)}&days=${days}`
      : null,
    fetcher,
    { refreshInterval: 0 }
  )

  function handleDaysChange(newDays: Days) {
    setDays(newDays)
    setSelectedMac(null) // reset; auto-select will pick new top device
  }

  function handleSelectDevice(mac: string) {
    setSelectedMac(mac)
  }

  return (
    <div className="space-y-8">
      {/* Time range tabs */}
      <div className="bg-zinc-800 rounded-lg p-1 flex w-fit">
        {DAY_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => handleDaysChange(value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              days === value
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
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
