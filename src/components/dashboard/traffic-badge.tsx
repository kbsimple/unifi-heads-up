// src/components/dashboard/traffic-badge.tsx
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TrafficBadgeProps {
  status: 'idle' | 'low' | 'medium' | 'high'
}

// Per UIUX-02: Color coding for traffic status
const statusConfig = {
  idle: {
    label: 'Idle',
    className: 'bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30',
  },
  low: {
    label: 'Low',
    className: 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
  },
  medium: {
    label: 'Medium',
    className: 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30',
  },
  high: {
    label: 'High',
    className: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
  },
} as const

export function TrafficBadge({ status }: TrafficBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs px-2 py-0.5', config.className)}
    >
      {config.label}
    </Badge>
  )
}