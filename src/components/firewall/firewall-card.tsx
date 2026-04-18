// src/components/firewall/firewall-card.tsx
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RuleToggle } from './rule-toggle'
import type { FirewallPolicy } from '@/lib/unifi/types'

interface FirewallCardProps {
  policy: FirewallPolicy
  policies: FirewallPolicy[]
}

/**
 * Firewall rule card component
 * Per D-03: Card with rule name left, badge + switch right
 * Per D-04: Badge variant based on enabled state
 * Per D-08: Minimal display fields - _id, name, enabled
 */
export function FirewallCard({ policy, policies }: FirewallCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Rule name - left aligned */}
          <p className="font-medium text-zinc-100">{policy.name}</p>

          {/* Badge + Switch - right aligned */}
          <div className="flex items-center gap-3">
            <Badge variant={policy.enabled ? 'default' : 'secondary'}>
              {policy.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <RuleToggle policy={policy} policies={policies} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}