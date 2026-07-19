'use client'

import useSWR from 'swr'
import { ShieldOff } from 'lucide-react'
import { RuleToggle } from '@/components/firewall/rule-toggle'
import { SchedulePicker } from '@/components/firewall/schedule-picker'
import { ScheduleBadge } from '@/components/firewall/schedule-badge'

interface DeviceRule {
  id: string
  name: string
  enabled: boolean
  scheduleEnd?: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export function InlineFirewallRules({ mac }: { mac: string }) {
  const key = `/api/firewall/device-rules?mac=${encodeURIComponent(mac)}`
  const { data, isLoading, error } = useSWR<DeviceRule[]>(key, fetcher)

  if (isLoading) {
    return <span className="text-xs text-zinc-600">Loading rules…</span>
  }

  if (error || !data || data.length === 0) {
    return (
      <span className="relative group inline-flex items-center text-zinc-600 cursor-default">
        <ShieldOff className="h-3.5 w-3.5" aria-label="No firewall rules" />
        <span className="absolute bottom-full left-0 mb-1.5 w-56 rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 hidden group-hover:block z-10 pointer-events-none whitespace-normal">
          No firewall rules apply to this device
        </span>
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {data.map(rule => {
        const policy = { _id: rule.id, name: rule.name, enabled: rule.enabled, scheduleEnd: rule.scheduleEnd }
        return (
          <div key={rule.id}>
            <div className="flex items-center gap-2">
              <RuleToggle policy={policy} extraMutateKeys={[key]} />
              <SchedulePicker policy={policy} extraMutateKeys={[key]} />
              <span className="text-xs text-zinc-300">{rule.name}</span>
            </div>
            {rule.scheduleEnd !== undefined && (
              <ScheduleBadge scheduleEnd={rule.scheduleEnd} />
            )}
          </div>
        )
      })}
    </div>
  )
}
