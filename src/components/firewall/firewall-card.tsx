// src/components/firewall/firewall-card.tsx
'use client'

import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RuleToggle } from './rule-toggle'
import { SchedulePicker } from './schedule-picker'
import { ScheduleBadge } from './schedule-badge'
import type { FirewallPolicy } from '@/lib/unifi/types'

interface FirewallCardProps {
  policy: FirewallPolicy
  isStarred: boolean
  onToggleStar: () => void
}

/**
 * Firewall rule card component
 * Per D-03: Card with rule name left, badge + switch right
 * Per D-04: Badge variant based on enabled state
 * Per D-08: Minimal display fields - _id, name, enabled
 * Per Phase 9: Star icon for bookmarking rules across sessions
 * Per Phase 11: Clock icon for schedule picker; expiry badge below rule name
 */
export function FirewallCard({ policy, isStarred, onToggleStar }: FirewallCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Rule name - left aligned */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-zinc-100">{policy.name}</p>
            {/* Expiry indicator — only when a future schedule is active (Phase 11) */}
            {policy.scheduleEnd !== undefined && (
              <ScheduleBadge scheduleEnd={policy.scheduleEnd} />
            )}
          </div>

          {/* Star | Badge | Clock | Switch - right aligned (UI-SPEC action cluster order) */}
          <div className="flex items-center gap-3 ml-3">
            <button
              onClick={onToggleStar}
              aria-label={isStarred ? 'Unstar rule' : 'Star rule'}
              className="focus:outline-none"
            >
              {isStarred ? (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <Star className="h-4 w-4 text-zinc-500 hover:text-yellow-400 transition-colors" />
              )}
            </button>
            <Badge variant={policy.enabled ? 'default' : 'secondary'}>
              {policy.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <SchedulePicker policy={policy} />
            <RuleToggle policy={policy} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
