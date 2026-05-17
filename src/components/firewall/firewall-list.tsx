'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ShieldOff, AlertCircle, RefreshCw, Star } from 'lucide-react'
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
 * Per Phase 9: Starred filter and star toggle with optimistic updates
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

  // Fetch starred rule IDs from server — persisted in SQLite across sessions
  const { data: starredData, mutate: mutateStarred } = useSWR<{ starredIds: string[] }>(
    '/api/firewall/starred',
    fetcher
  )
  const starredIds = new Set(starredData?.starredIds ?? [])

  const [showStarredOnly, setShowStarredOnly] = useState(false)

  /**
   * Toggle star state for a policy with optimistic update.
   * Immediately updates local state, then confirms with the server.
   * Reverts on server error.
   */
  async function handleToggleStar(policy: FirewallPolicy) {
    const nextStarred = !starredIds.has(policy._id)
    const optimisticSet = new Set(starredIds)
    if (nextStarred) {
      optimisticSet.add(policy._id)
    } else {
      optimisticSet.delete(policy._id)
    }

    // Optimistic update — no revalidation yet
    await mutateStarred({ starredIds: [...optimisticSet] }, { revalidate: false })

    try {
      await fetch('/api/firewall/starred', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId: policy._id, starred: nextStarred }),
      })
    } catch {
      // Revert on error
      await mutateStarred()
    }
  }

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

  // Empty state (no policies at all)
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

  // Apply starred filter client-side — no extra API call
  const visiblePolicies = showStarredOnly
    ? policies.filter((p) => starredIds.has(p._id))
    : policies

  return (
    <div>
      {/* Filter toggle — right-aligned above the card list */}
      <div className="flex justify-end mb-3">
        <Button
          variant={showStarredOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowStarredOnly((v) => !v)}
        >
          <Star className={`h-3 w-3 mr-1 ${showStarredOnly ? 'fill-current' : ''}`} />
          Starred only
        </Button>
      </div>

      {/* Empty starred filter state */}
      {showStarredOnly && visiblePolicies.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Star className="h-8 w-8 text-zinc-500 mb-4" />
          <p className="text-sm text-zinc-400">
            No starred rules — click ★ on any rule to star it
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePolicies.map((policy) => (
            <FirewallCard
              key={policy._id}
              policy={policy}
              isStarred={starredIds.has(policy._id)}
              onToggleStar={() => handleToggleStar(policy)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
