'use client'

import { useState } from 'react'
import { TrafficBadge } from './traffic-badge'
import { useTrafficHistory } from '@/contexts/traffic-history-context'
import { formatTimeAgo, formatRate } from '@/lib/unifi/format'
import type { NetworkClient } from '@/lib/unifi/types'

interface ClientTableProps {
  clients: NetworkClient[]
  activeOnly?: boolean
}

type SortColumn = 'displayName' | 'ip' | 'mac' | 'trafficStatus' | 'lastBusy' | null
type SortDirection = 'asc' | 'desc'

const STATUS_ORDER = { high: 3, medium: 2, low: 1, idle: 0 } as const

function ipToNum(ip: string | null): number {
  if (!ip) return -1
  return ip.split('.').reduce((acc, octet) => acc * 256 + parseInt(octet, 10), 0)
}

const STATUS_TOOLTIP =
  'Idle: <0.5 Mbps · Low: 0.5–1 Mbps · Medium: 1–2 Mbps · High: ≥2 Mbps'


function SignalDot({ dbm }: { dbm: number }) {
  const color =
    dbm >= -50 ? 'bg-emerald-400' :
    dbm >= -70 ? 'bg-yellow-400' :
    'bg-red-400'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span>{dbm} dBm</span>
    </span>
  )
}

function SortIndicator({ column, sortColumn, sortDirection }: {
  column: Exclude<SortColumn, null>
  sortColumn: SortColumn
  sortDirection: SortDirection
}) {
  if (column !== sortColumn) return <span className="ml-1 text-zinc-700">↕</span>
  return <span className="ml-1 text-zinc-300">{sortDirection === 'asc' ? '↑' : '↓'}</span>
}

export function ClientTable({ clients, activeOnly = false }: ClientTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const { getClientLastBusy } = useTrafficHistory()

  function handleSort(column: Exclude<SortColumn, null>) {
    if (column === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  function compareByColumn(a: NetworkClient, b: NetworkClient): number {
    if (sortColumn === null) return 0
    let cmp = 0
    switch (sortColumn) {
      case 'displayName':
        cmp = a.displayName.localeCompare(b.displayName)
        break
      case 'ip':
        cmp = ipToNum(a.ip) - ipToNum(b.ip)
        break
      case 'mac':
        cmp = a.mac.localeCompare(b.mac)
        break
      case 'trafficStatus':
        cmp = STATUS_ORDER[a.trafficStatus] - STATUS_ORDER[b.trafficStatus]
        break
      case 'lastBusy': {
            const aTime = getClientLastBusy(a.id) ?? 0
            const bTime = getClientLastBusy(b.id) ?? 0
            cmp = aTime - bTime
            break
          }
        }
    return sortDirection === 'asc' ? cmp : -cmp
  }

  const sorted = [...clients].sort((a, b) => {
    if (activeOnly) {
      // Status is always primary sort (high first) in active-only mode
      const statusCmp = STATUS_ORDER[b.trafficStatus] - STATUS_ORDER[a.trafficStatus]
      if (statusCmp !== 0) return statusCmp
    }
    return compareByColumn(a, b)
  })

  function thClass(col: SortColumn, extra = '') {
    return `h-12 px-4 text-left text-xs font-medium uppercase text-zinc-500 cursor-pointer select-none hover:text-zinc-300 transition-colors ${extra}`
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className={thClass('displayName')} onClick={() => handleSort('displayName')}>
              Device Name
              <SortIndicator column="displayName" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
            <th className={thClass('ip', 'w-[140px]')} onClick={() => handleSort('ip')}>
              IP Address
              <SortIndicator column="ip" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
            <th className={thClass('mac', 'w-[160px]')} onClick={() => handleSort('mac')}>
              MAC Address
              <SortIndicator column="mac" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
            <th className={thClass(null, 'w-[140px] text-right')}>↓ Download</th>
            <th className={thClass(null, 'w-[140px] text-right')}>↑ Upload</th>
            <th className={thClass(null, 'w-[120px] text-right')}>Signal</th>
            <th className={`${thClass('trafficStatus', 'w-[120px]')} text-center`} onClick={() => handleSort('trafficStatus')}>
              <span className="inline-flex items-center gap-1">
                Status
                <SortIndicator column="trafficStatus" sortColumn={sortColumn} sortDirection={sortDirection} />
                <span className="relative group">
                  <span className="text-zinc-600 cursor-help font-normal normal-case">(?)</span>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 normal-case font-normal hidden group-hover:block z-10 whitespace-normal pointer-events-none">
                    {STATUS_TOOLTIP}
                  </span>
                </span>
              </span>
            </th>
            <th className={`${thClass('lastBusy', 'w-[130px]')} text-right`} onClick={() => handleSort('lastBusy')}>
              Last Busy
              <SortIndicator column="lastBusy" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((client) => {
            const lastBusy = getClientLastBusy(client.id)
            return (
              <tr
                key={client.id}
                className="border-b border-zinc-800 h-12 hover:bg-zinc-800/50 transition-colors"
              >
                <td className="px-4 font-medium text-zinc-100">{client.displayName}</td>
                <td className="px-4 text-sm text-zinc-400">{client.ip ?? 'No IP'}</td>
                <td className="px-4 text-sm text-zinc-400">{client.mac}</td>
                <td className="px-4 text-right text-sm text-zinc-400">{formatRate(client.downloadRate)}</td>
                <td className="px-4 text-right text-sm text-zinc-400">{formatRate(client.uploadRate)}</td>
                <td className="px-4 text-right text-sm text-zinc-400">
                  {client.signal !== null ? <SignalDot dbm={client.signal} /> : <span className="text-zinc-600">wired</span>}
                </td>
                <td className="px-4 text-center">
                  <TrafficBadge status={client.trafficStatus} />
                </td>
                <td className="px-4 text-right text-sm text-zinc-400">
                  {lastBusy ? formatTimeAgo(lastBusy) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
