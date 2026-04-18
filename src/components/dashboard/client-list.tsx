'use client'

import useSWR from 'swr'
import { ClientCard } from './client-card'
import { ClientTable } from './client-table'
import { LastUpdated } from './last-updated'
import { EmptyState } from './empty-state'
import { ErrorState } from './error-state'
import { TrafficChart, formatHourLabel } from './traffic-chart'
import { TrafficHistoryProvider, useTrafficHistory } from '@/contexts/traffic-history-context'
import { Card, CardContent } from '@/components/ui/card'
import type { ClientsResponse } from '@/lib/unifi/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ClientListProps {
  initialData: ClientsResponse
}

function ClientListInner({ initialData }: ClientListProps) {
  const { data, error, isLoading, mutate } = useSWR<ClientsResponse>(
    '/api/clients',
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: 60000, // Per DEVI-05: 60 second polling
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Retry with exponential backoff, max 3 retries (per RESEARCH.md Pitfall 2)
        if (retryCount >= 3) return
        setTimeout(() => revalidate({ retryCount }), 5000 * retryCount)
      },
    }
  )

  const { siteHistory, isHistoryAvailable } = useTrafficHistory()

  // Error state with retry button (UIUX-05)
  if (error) {
    return <ErrorState onRetry={() => mutate()} />
  }

  const clients = data?.clients ?? []
  const lastUpdated = data?.timestamp ? new Date(data.timestamp) : new Date()

  const siteChartData = siteHistory.map((sample) => ({
    time: formatHourLabel(sample.hourStart),
    bandwidth: (sample.avgDownload + sample.avgUpload) / 1_000_000,
  }))

  // Empty state when no clients
  if (clients.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      {/* Last updated timestamp (UIUX-03) */}
      <LastUpdated date={lastUpdated} isLoading={isLoading} />

      {/* Site traffic section (D-14) — shown once history is available */}
      {isHistoryAvailable && (
        <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Site Traffic (24h)</h3>
            <TrafficChart data={siteChartData} />
          </CardContent>
        </Card>
      )}

      {/* Responsive layout: cards on mobile, table on desktop (UIUX-01) */}
      <div className="md:hidden space-y-3">
        {clients.map((client) => (
          <ClientCard key={client.mac} client={client} />
        ))}
      </div>

      <div className="hidden md:block">
        <ClientTable clients={clients} />
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
