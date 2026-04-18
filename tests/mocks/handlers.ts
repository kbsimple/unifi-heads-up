// tests/mocks/handlers.ts
// MSW handlers for hermetic testing - no real UniFi API calls
import { http, HttpResponse } from 'msw'
import type { FirewallPolicy } from '@/lib/unifi/types'

// Mock policy data
export const mockPolicies: FirewallPolicy[] = [
  { _id: 'policy-1', name: 'Block Gaming', enabled: true },
  { _id: 'policy-2', name: 'Allow Streaming', enabled: false },
  { _id: 'policy-3', name: 'Block Social Media', enabled: true },
]

// Track API calls for assertions in tests
export const apiCalls = {
  getCalls: [] as Array<{ url: string; timestamp: number }>,
  putCalls: [] as Array<{ url: string; body: unknown; timestamp: number }>,
}

// Reset call tracking between tests
export function resetApiCalls() {
  apiCalls.getCalls = []
  apiCalls.putCalls = []
}

// MSW handlers for /api/firewall
export const firewallHandlers = [
  // GET /api/firewall - list policies
  http.get('/api/firewall', () => {
    apiCalls.getCalls.push({ url: '/api/firewall', timestamp: Date.now() })
    return HttpResponse.json({
      policies: mockPolicies,
      timestamp: Date.now(),
    })
  }),

  // PUT /api/firewall - toggle policy
  http.put('/api/firewall', async ({ request }) => {
    const body = await request.json() as { policyId: string; enabled: boolean }
    apiCalls.putCalls.push({ url: '/api/firewall', body, timestamp: Date.now() })

    // Find and update the policy
    const policy = mockPolicies.find(p => p._id === body.policyId)
    if (policy) {
      policy.enabled = body.enabled
    }

    return HttpResponse.json({ success: true })
  }),
]