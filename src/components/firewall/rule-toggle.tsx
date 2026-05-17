// src/components/firewall/rule-toggle.tsx
'use client'

import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import type { FirewallPolicy } from '@/lib/unifi/types'

interface FirewallData {
  policies: FirewallPolicy[]
  timestamp: number
}

interface RuleToggleProps {
  policy: FirewallPolicy
  data: FirewallData
}

/**
 * Switch component for toggling firewall rules
 * Per D-05: Optimistic update - switch animates immediately on click
 * Per D-06: On error, SWR rollbackOnError reverts state and toast displays error
 */
export function RuleToggle({ policy, data }: RuleToggleProps) {
  const { mutate } = useSWRConfig()

  const handleToggle = async (checked: boolean) => {
    // Optimistic update: immediately update local state
    const updatedPolicies = data.policies.map((p) =>
      p._id === policy._id ? { ...p, enabled: checked } : p
    )

    // Preserve the full SWR cache shape so consumers reading data?.policies
    // don't receive undefined and flash the empty state.
    const optimisticData: FirewallData = {
      policies: updatedPolicies,
      timestamp: data.timestamp,
    }

    // Per D-05: Call mutate with optimisticData immediately
    mutate('/api/firewall', optimisticData, {
      optimisticData,
      rollbackOnError: true,
      revalidate: true,
    })

    // Then call API to persist change
    try {
      const response = await fetch('/api/firewall', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          policyId: policy._id,
          enabled: checked,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update firewall rule')
      }

      // Success - SWR will revalidate and update from server
    } catch (error) {
      // Per D-06: Show toast error on failure
      // SWR's rollbackOnError: true will revert the optimistic update
      toast.error('Unable to update firewall rule. Changes reverted automatically.')
    }
  }

  return (
    <Switch
      checked={policy.enabled}
      onCheckedChange={handleToggle}
      aria-label={`Toggle ${policy.name}`}
    />
  )
}