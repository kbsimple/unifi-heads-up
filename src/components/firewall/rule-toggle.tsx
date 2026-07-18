// src/components/firewall/rule-toggle.tsx
'use client'

import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import type { FirewallPolicy } from '@/lib/unifi/types'

interface RuleToggleProps {
  policy: FirewallPolicy
  extraMutateKeys?: string[]
}

/**
 * Switch component for toggling firewall rules
 * Disables the switch with a visual pending cue while the API call is in flight.
 * Only updates displayed state after the server confirms success (SWR revalidation).
 * On error, re-enables in original position and shows a toast.
 */
export function RuleToggle({ policy, extraMutateKeys = [] }: RuleToggleProps) {
  const [isPending, setIsPending] = useState(false)
  const { mutate } = useSWRConfig()

  const handleToggle = async (checked: boolean) => {
    setIsPending(true)
    try {
      const response = await fetch('/api/firewall', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: policy._id, enabled: checked }),
      })
      if (!response.ok) throw new Error('Failed to update firewall rule')
      // Revalidate from server — do not optimistically update
      await mutate('/api/firewall')
      // Revalidate any additional SWR keys (e.g. device-rules cache for the expanded row)
      await Promise.all(extraMutateKeys.map(key => mutate(key)))
    } catch {
      toast.error('Unable to update firewall rule. Changes reverted automatically.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className={isPending ? 'opacity-50 cursor-not-allowed' : ''}>
      <Switch
        checked={policy.enabled}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label={`Toggle ${policy.name}`}
      />
    </div>
  )
}
