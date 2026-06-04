'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrafficBadge } from './traffic-badge'
import { TrafficChart } from './traffic-chart'
import { useTrafficHistory } from '@/contexts/traffic-history-context'
import { formatTimeAgo, formatRate, formatPacificHour } from '@/lib/unifi/format'
import type { NetworkClient } from '@/lib/unifi/types'
import type { HistoryBucket } from '@/lib/insights/queries'

interface ClientCardProps {
  client: NetworkClient
}

export function ClientCard({ client }: ClientCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [dbHistory, setDbHistory] = useState<HistoryBucket[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const { getClientLastBusy } = useTrafficHistory()
  const lastBusy = getClientLastBusy(client.id)

  useEffect(() => {
    if (!showHistory || dbHistory !== null) return

    setHistoryLoading(true)
    fetch(`/api/insights/device-history?mac=${encodeURIComponent(client.mac)}`)
      .then((r) => r.json())
      .then((data: HistoryBucket[]) => {
        setDbHistory(data)
      })
      .catch(() => {
        setDbHistory([])
      })
      .finally(() => {
        setHistoryLoading(false)
      })
  }, [showHistory, client.mac, dbHistory])

  const chartData = (dbHistory ?? []).map((b) => ({
    time: formatPacificHour(b.hourTs),
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
            ) : (
              <TrafficChart data={chartData} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
