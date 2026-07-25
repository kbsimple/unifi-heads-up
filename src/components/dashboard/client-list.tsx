'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { ClientCard } from './client-card'
import { ClientTable } from './client-table'
import { LastUpdated } from './last-updated'
import { EmptyState } from './empty-state'
import { ErrorState } from './error-state'
import { TrafficChart, WindowSelector, formatHourLabel } from './traffic-chart'
import { TrafficHistoryProvider, useTrafficHistory } from '@/contexts/traffic-history-context'
import { bytesPerSecToMbps } from '@/lib/unifi/traffic'
import { formatBucketLabel } from '@/lib/unifi/format'
import { bucketSecondsForWindow } from '@/lib/insights/queries'
import type { HistoryBucket } from '@/lib/insights/queries'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import type { ClientsResponse } from '@/lib/unifi/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ClientListProps {
  initialData: ClientsResponse
}

function ClientListInner({ initialData }: ClientListProps) {
  const [activeOnly, setActiveOnly] = useState(false)
  const [siteWindow, setSiteWindow] = useState<number>(1440)
  const [siteApiData, setSiteApiData] = useState<HistoryBucket[] | null>(null)
  const { data, error, isLoading, mutate } = useSWR<ClientsResponse>(
    '/api/clients',
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: 60000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return
        setTimeout(() => revalidate({ retryCount }), 5000 * retryCount)
      },
    }
  )

  const { siteHistory, isHistoryAvailable, getClientLastBusy } = useTrafficHistory()

  useEffect(() => {
    if (siteWindow === 1440) {
      setSiteApiData(null)
      return
    }
    setSiteApiData(null)
    fetch(`/api/insights/site-history?window=${siteWindow}`)
      .then((r) => r.json())
      .then((d: HistoryBucket[]) => setSiteApiData(d))
      .catch(() => setSiteApiData([]))
  }, [siteWindow])

  if (error) {
    return <ErrorState onRetry={() => mutate()} />
  }

  const STATUS_ORDER = { high: 3, medium: 2, low: 1, idle: 0 } as const

  const allClients = data?.clients ?? []
  const clients = activeOnly ? allClients.filter(c => c.trafficStatus !== 'idle') : allClients

  const clientsSortedForMobile = [...clients].sort((a, b) => {
    const statusDiff = STATUS_ORDER[b.trafficStatus] - STATUS_ORDER[a.trafficStatus]
    if (statusDiff !== 0) return statusDiff
    const aLastBusy = Math.max(getClientLastBusy(a.id) ?? 0, a.lastBusy ?? 0)
    const bLastBusy = Math.max(getClientLastBusy(b.id) ?? 0, b.lastBusy ?? 0)
    return bLastBusy - aLastBusy
  })
  const lastUpdated = data?.timestamp ? new Date(data.timestamp) : new Date()

  const siteChartData = siteWindow === 1440
    ? siteHistory.map((sample) => ({
        time: formatHourLabel(sample.hourStart),
        bandwidth: bytesPerSecToMbps(sample.avgDownload + sample.avgUpload),
      }))
    : (siteApiData ?? []).map((b) => ({
        time: formatBucketLabel(b.bucketTs, bucketSecondsForWindow(siteWindow)),
        bandwidth: b.avgMbps,
      }))

  if (allClients.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      {/* Active only toggle + last updated */}
      <div className="flex items-center justify-between">
        <LastUpdated date={lastUpdated} isLoading={isLoading} />
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-zinc-400">
          <Switch
            checked={activeOnly}
            onCheckedChange={setActiveOnly}
            size="sm"
          />
          Active only
        </label>
      </div>

      {/* Site traffic section — shown once history is available or non-24h window selected */}
      {(isHistoryAvailable || siteWindow !== 1440) && (
        <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-zinc-400">Site Traffic</h3>
              <WindowSelector value={siteWindow} onChange={setSiteWindow} />
            </div>
            <TrafficChart data={siteChartData} />
          </CardContent>
        </Card>
      )}

      {/* Responsive layout: cards on mobile, table on desktop (UIUX-01) */}
      <div className="md:hidden space-y-3">
        {clientsSortedForMobile.map((client) => (
          <ClientCard key={client.mac} client={client} />
        ))}
      </div>

      <div className="hidden md:block">
        <ClientTable clients={clients} activeOnly={activeOnly} />
      </div>
    </div>
  )
}

export function ClientList({ initialData }: ClientListProps) {
  return (
    <TrafficHistoryProvider>
      <ClientListInner initialData={initialData} />
    </TrafficHistoryProvider>
  )
}
