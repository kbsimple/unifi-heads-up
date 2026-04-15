// src/components/dashboard/client-card.tsx
import { Card, CardContent } from '@/components/ui/card'
import { TrafficBadge } from './traffic-badge'
import type { NetworkClient } from '@/lib/unifi/types'

interface ClientCardProps {
  client: NetworkClient
}

function formatLastActive(date: Date | null): string {
  if (!date) return 'Unknown'

  const now = Date.now()
  const then = date.getTime()
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
          <p className="text-xs text-zinc-500">
            Last active: {formatLastActive(client.lastSeen)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}