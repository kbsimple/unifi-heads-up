'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import type { FirewallPolicy } from '@/lib/unifi/types'

interface SchedulePickerProps {
  policy: FirewallPolicy
}

const PRESETS: { label: string; hours: number; ariaLabel: string }[] = [
  { label: '2h',  hours: 2,  ariaLabel: 'Enable for 2 hours' },
  { label: '6h',  hours: 6,  ariaLabel: 'Enable for 6 hours' },
  { label: '24h', hours: 24, ariaLabel: 'Enable for 24 hours' },
]

export function SchedulePicker({ policy }: SchedulePickerProps) {
  const [isPending, setIsPending] = useState(false)
  const [open, setOpen] = useState(false)
  const { mutate } = useSWRConfig()

  const hasSchedule = Boolean(policy.scheduleEnd)
  const clockAriaLabel = hasSchedule
    ? `Edit schedule for ${policy.name}`
    : `Set schedule for ${policy.name}`

  const handlePreset = async (hours: number) => {
    setIsPending(true)
    setOpen(false)
    try {
      const response = await fetch('/api/firewall/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: policy._id, durationHours: hours }),
      })
      if (!response.ok) throw new Error('Failed to set schedule')
      await mutate('/api/firewall')
    } catch {
      toast.error('Unable to set schedule. Try again.')
    } finally {
      setIsPending(false)
    }
  }

  const handleClear = async () => {
    setIsPending(true)
    setOpen(false)
    try {
      const response = await fetch('/api/firewall/schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: policy._id, enabled: policy.enabled }),
      })
      if (!response.ok) throw new Error('Failed to clear schedule')
      await mutate('/api/firewall')
    } catch {
      toast.error('Unable to clear schedule. Try again.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className={isPending ? 'opacity-50 cursor-not-allowed' : ''}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={clockAriaLabel}
          disabled={isPending}
          className="focus:outline-none bg-transparent border-0 p-0 cursor-pointer"
        >
          <Clock
            className={`h-4 w-4 ${hasSchedule ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300 transition-colors'}`}
          />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-50 p-3 bg-zinc-900 border-zinc-800"
        >
          <p className="text-sm font-medium text-zinc-100 mb-3">Set active duration</p>
          <div className="flex gap-2">
            {PRESETS.map(({ label, hours, ariaLabel }) => (
              <Button
                key={hours}
                variant="outline"
                aria-label={ariaLabel}
                aria-pressed={false}
                className="flex-1 h-11 text-sm font-medium"
                onClick={() => handlePreset(hours)}
              >
                {label}
              </Button>
            ))}
          </div>
          {hasSchedule && (
            <Button
              variant="ghost"
              aria-label={`Clear schedule for ${policy.name}`}
              className="w-full mt-2 text-destructive hover:text-destructive"
              onClick={handleClear}
            >
              Clear schedule
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
