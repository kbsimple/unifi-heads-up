'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrafficBadge } from './traffic-badge'
import { TrafficChart, formatHourLabel } from './traffic-chart'
import { useTrafficHistory } from '@/contexts/traffic-history-context'
import type { NetworkClient } from '@/lib/unifi/types'

interface ClientCardProps {
  client: NetworkClient
}

function formatLastActive(date: Date | string | null): string {
  if (!date) return 'Unknown'

  const d = date instanceof Date ? date : new Date(date)
  const now = Date.now()
  const then = d.getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function ClientCard({ client }: ClientCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  const { getClientHistory } = useTrafficHistory()

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
              Last active: {formatLastActive(client.lastSeen)}
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
