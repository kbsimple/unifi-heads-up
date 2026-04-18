'use client'

import useSWR from 'swr'
import { ShieldOff, AlertCircle, RefreshCw } from 'lucide-react'
import { FirewallCard } from './firewall-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { FirewallPolicy } from '@/lib/unifi/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface FirewallListProps {
  initialData?: { policies: FirewallPolicy[]; timestamp: number }
}

/**
 * FirewallList component
 * Per UI-SPEC: Displays firewall rules with loading, empty, and error states
 * Per D-05: SWR polling with 60-second refresh interval
 */
export function FirewallList({ initialData }: FirewallListProps) {
  const { data, error, isLoading, mutate } = useSWR<{ policies: FirewallPolicy[]; timestamp: number }>(
    '/api/firewall',
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: 60000, // Per UI-SPEC: 60-second polling
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Retry with exponential backoff, max 3 retries
        if (retryCount >= 3) return
        setTimeout(() => revalidate({ retryCount }), 5000 * retryCount)
      },
    }
  )

  // Error state with retry button
  if (error) {
    return (
      <Alert variant="destructive" className="bg-card">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Unable to load firewall rules</AlertTitle>
        <AlertDescription>
          Please check your connection and try again.
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  // Loading state: show skeletons while loading with no data
  if (isLoading && !data) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  const policies = data?.policies ?? []

  // Empty state
  if (policies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ShieldOff className="h-8 w-8 text-zinc-500 mb-4" />
        <h3 className="text-lg font-medium text-zinc-100 mb-2">
          No firewall rules found
        </h3>
        <p className="text-sm text-zinc-400 max-w-md">
          Your network may not have any firewall rules configured, or there was an issue loading rules from your UniFi console.
        </p>
      </div>
    )
  }

  // Data state: render firewall cards
  return (
    <div className="space-y-3">
      {policies.map((policy) => (
        <FirewallCard
          key={policy._id}
          policy={policy}
          policies={policies}
        />
      ))}
    </div>
  )
}