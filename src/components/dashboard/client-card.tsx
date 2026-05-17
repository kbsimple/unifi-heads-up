'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrafficBadge } from './traffic-badge'
import { TrafficChart, formatHourLabel } from './traffic-chart'
import { useTrafficHistory } from '@/contexts/traffic-history-context'
import { formatTimeAgo } from '@/lib/unifi/format'
import type { NetworkClient } from '@/lib/unifi/types'

interface ClientCardProps {
  client: NetworkClient
}

export function ClientCard({ client }: ClientCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  const { getClientHistory, getClientLastBusy } = useTrafficHistory()
  const lastBusy = getClientLastBusy(client.id)

  const clientHistory = getClientHistory(client.id)
  const chartData = clientHistory.map((sample) => ({
    time: formatHourLabel(sample.hourStart),
    bandwidth: (sample.avgDownload + sample.avgUpload) / 1_000_000,
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
            {chartData.length > 0 ? (
              <TrafficChart data={chartData} />
            ) : (
              <p className="text-sm text-zinc-500 py-3 text-center">
                No traffic history available yet. History accumulates during your session.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
