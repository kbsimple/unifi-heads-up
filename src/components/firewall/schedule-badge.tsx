'use client'

import { Clock } from 'lucide-react'

interface ScheduleBadgeProps {
  scheduleEnd: number  // Unix ms
}

export function ScheduleBadge({ scheduleEnd }: ScheduleBadgeProps) {
  const now = Date.now()
  const isExpired = scheduleEnd <= now

  let displayText: string
  if (isExpired) {
    displayText = 'Expired — reload to refresh'
  } else {
    const endDate = new Date(scheduleEnd)
    const timeStr = endDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    displayText = `Expires at ${timeStr}`
  }

  return (
    <div
      role="status"
      className="flex items-center gap-2 mt-1 text-blue-400"
    >
      <Clock className="h-3 w-3 flex-shrink-0" />
      <span className="text-sm">{displayText}</span>
    </div>
  )
}
