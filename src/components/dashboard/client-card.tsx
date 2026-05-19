'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrafficBadge } from './traffic-badge'
import { TrafficChart } from './traffic-chart'
import { useTrafficHistory } from '@/contexts/traffic-history-context'
import { formatTimeAgo, formatRate } from '@/lib/unifi/format'
import type { NetworkClient } from '@/lib/unifi/types'

interface ClientCardProps {
  client: NetworkClient
}

interface HourlyBucket {
  hour: number
  avgMbps: number
  active: boolean
}

function formatHourOfDay(hour: number): string {
  const ampm = hour >= 12 ? 'pm' : 'am'
  const h = hour % 12 || 12
  return `${h}${ampm}`
}

export function ClientCard({ client }: ClientCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [dbHistory, setDbHistory] = useState<HourlyBucket[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const { getClientLastBusy } = useTrafficHistory()
  const lastBusy = getClientLastBusy(client.id)

  // Fetch DB-backed history when the panel is opened for the first time
  useEffect(() => {
    if (!showHistory || dbHistory !== null) return

    setHistoryLoading(true)
    fetch(`/api/insights/device-activity?mac=${encodeURIComponent(client.mac)}&minutes=10080`)
      .then((r) => r.json())
      .then((data: HourlyBucket[]) => {
        setDbHistory(data)
      })
      .catch(() => {
        setDbHistory([])
      })
      .finally(() => {
        setHistoryLoading(false)
      })
  }, [showHistory, client.mac, dbHistory])

  // Only show hours that have non-zero activity
  const chartData = (dbHistory ?? [])
    .filter((b) => b.avgMbps > 0)
    .map((b) => ({
      time: formatHourOfDay(b.hour),
      bandwidth: b.avgMbps,
    }))

  return (
    <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-medium text-zinc-100">{client.displayName}</p>
            <p className="text-sm text-zinc-400">
              {client.ip ?? 'No IP'} &bull; {client.mac}
            </p>
          </div>
          <TrafficBadge status={client.trafficStatus} />
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
          <span>↓ {formatRate(client.downloadRate)}</span>
          <span>↑ {formatRate(client.uploadRate)}</span>
          {client.signal !== null && (
            <span>{client.signal} dBm</span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Last busy: {lastBusy ? formatTimeAgo(lastBusy) : '—'}
            </p>
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              aria-expanded={showHistory}
              className="text-sm text-sky-600 hover:text-sky-500 cursor-pointer"
            >
              {showHistory ? 'Hide History' : 'View History'}
            </button>
          </div>
        </div>

        {showHistory && (
          <div className="mt-3">
            {historyLoading ? (
              <p className="text-sm text-zinc-500 py-3 text-center">Loading history…</p>
            ) : chartData.length > 0 ? (
              <TrafficChart data={chartData} />
            ) : (
              <p className="text-sm text-zinc-500 py-3 text-center">
                No traffic history recorded yet. Data accumulates over time.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
