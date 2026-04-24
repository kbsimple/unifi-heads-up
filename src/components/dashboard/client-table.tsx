// src/components/dashboard/client-table.tsx
import { TrafficBadge } from './traffic-badge'
import type { NetworkClient } from '@/lib/unifi/types'

interface ClientTableProps {
  clients: NetworkClient[]
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

export function ClientTable({ clients }: ClientTableProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="h-12 px-4 text-left text-xs font-medium uppercase text-zinc-500">
              Device Name
            </th>
            <th className="h-12 px-4 text-left text-xs font-medium uppercase text-zinc-500 w-[140px]">
              IP Address
            </th>
            <th className="h-12 px-4 text-left text-xs font-medium uppercase text-zinc-500 w-[160px]">
              MAC Address
            </th>
            <th className="h-12 px-4 text-center text-xs font-medium uppercase text-zinc-500 w-[100px]">
              Status
            </th>
            <th className="h-12 px-4 text-right text-xs font-medium uppercase text-zinc-500 w-[120px]">
              Last Active
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr
              key={client.id}
              className="border-b border-zinc-800 h-12 hover:bg-zinc-800/50 transition-colors"
            >
              <td className="px-4 font-medium text-zinc-100">
                {client.displayName}
              </td>
              <td className="px-4 text-sm text-zinc-400">
                {client.ip ?? 'No IP'}
              </td>
              <td className="px-4 text-sm text-zinc-400">{client.mac}</td>
              <td className="px-4 text-center">
                <TrafficBadge status={client.trafficStatus} />
              </td>
              <td className="px-4 text-right text-sm text-zinc-400">
                {formatLastActive(client.lastSeen)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}