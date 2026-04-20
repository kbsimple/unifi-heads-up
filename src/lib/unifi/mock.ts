// src/lib/unifi/mock.ts
// Mock implementation of the UniFi client for local development.
// Used when UNIFI_MOCK=true is set (via dev.sh).
// Do NOT add `import 'server-only'` here — index.ts enforces the server boundary.

import type { NetworkClient, ClientsResponse, FirewallPolicy } from './types'

// Traffic thresholds (from traffic.ts): Idle <1 Mbps, Low 1–10, Medium 10–100, High >100
// Conversion formula: (downloadRate + uploadRate) * 8 / 1_000_000 = Mbps
// Bytes/s ranges: Idle <125K | Low 125K–1.25M | Medium 1.25M–12.5M | High >12.5M

const MOCK_CLIENTS: NetworkClient[] = [
  {
    id: 'mock-1',
    mac: 'aa:bb:cc:dd:ee:01',
    displayName: 'MacBook Pro (Work)',
    ip: '192.168.1.101',
    lastSeen: new Date(),
    isWired: true,
    isGuest: false,
    downloadRate: 15_000_000,
    uploadRate: 2_000_000,
    // Combined 17M bytes/s = 136 Mbps → high
    trafficStatus: 'high',
  },
  {
    id: 'mock-2',
    mac: 'aa:bb:cc:dd:ee:02',
    displayName: 'Smart TV',
    ip: '192.168.1.102',
    lastSeen: new Date(),
    isWired: true,
    isGuest: false,
    downloadRate: 2_000_000,
    uploadRate: 50_000,
    // Combined 2.05M bytes/s = 16.4 Mbps → medium
    trafficStatus: 'medium',
  },
  {
    id: 'mock-3',
    mac: 'aa:bb:cc:dd:ee:03',
    displayName: "Dad's iPhone",
    ip: '192.168.1.103',
    lastSeen: new Date(),
    isWired: false,
    isGuest: false,
    downloadRate: 500_000,
    uploadRate: 100_000,
    // Combined 600K bytes/s = 4.8 Mbps → low
    trafficStatus: 'low',
  },
  {
    id: 'mock-4',
    mac: 'aa:bb:cc:dd:ee:04',
    displayName: "Mom's iPad",
    ip: '192.168.1.104',
    lastSeen: new Date(),
    isWired: false,
    isGuest: false,
    downloadRate: 300_000,
    uploadRate: 80_000,
    // Combined 380K bytes/s = 3 Mbps → low
    trafficStatus: 'low',
  },
  {
    id: 'mock-5',
    mac: 'aa:bb:cc:dd:ee:05',
    displayName: 'Ring Doorbell',
    ip: '192.168.1.105',
    lastSeen: new Date(),
    isWired: false,
    isGuest: false,
    downloadRate: 0,
    uploadRate: 0,
    // Combined 0 bytes/s = 0 Mbps → idle
    trafficStatus: 'idle',
  },
  {
    id: 'mock-6',
    mac: 'aa:bb:cc:dd:ee:06',
    displayName: 'Nintendo Switch',
    ip: '192.168.1.106',
    lastSeen: new Date(),
    isWired: false,
    isGuest: false,
    downloadRate: 3_500_000,
    uploadRate: 1_000_000,
    // Combined 4.5M bytes/s = 36 Mbps → medium
    trafficStatus: 'medium',
  },
]

// Module-level mutable state — resets on server restart or when this file is edited (HMR).
// This is intentional: MOCK-05 only requires persistence for the duration of a dev session.
let mockPolicies: FirewallPolicy[] = [
  { _id: 'policy-1', name: 'Block Gaming Consoles',  enabled: true  },
  { _id: 'policy-2', name: 'Pause Kids Devices',     enabled: false },
  { _id: 'policy-3', name: 'Guest Network Restrict', enabled: true  },
]

export async function getUnifiClients(): Promise<ClientsResponse> {
  return { clients: MOCK_CLIENTS, timestamp: Date.now() }
}

export async function getFirewallPolicies(): Promise<FirewallPolicy[]> {
  // Shallow copy so callers cannot mutate module state directly
  return mockPolicies.map(p => ({ ...p }))
}

export async function updateFirewallPolicy(
  policyId: string,
  enabled: boolean
): Promise<FirewallPolicy> {
  const index = mockPolicies.findIndex(p => p._id === policyId)
  if (index === -1) throw new Error(`Mock policy not found: ${policyId}`)
  mockPolicies[index] = { ...mockPolicies[index], enabled }
  return { ...mockPolicies[index] }
}

export async function isZoneBasedFirewallEnabled(): Promise<boolean> {
  // No-op mock — returns false so firewall UI renders in legacy policy mode
  return false
}
