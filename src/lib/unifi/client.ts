/**
 * Direct LAN client to the UniFi console — replaces the Site Manager Proxy of v1.x.
 *
 * Module-level undici Agent provides scoped TLS bypass (rejectUnauthorized: false)
 * for the console's self-signed certificate, without affecting other HTTPS traffic
 * in the process.
 *
 * When UNIFI_MOCK=true, src/lib/unifi/index.ts routes to ./mock.ts and this file
 * is never invoked.
 */
// src/lib/unifi/client.ts
import 'server-only'
import { fetch, Agent } from 'undici'
import { z } from 'zod'
import {
  UnifiClientSchema,
  FirewallPolicySchema,
  FirewallPolicyResponseSchema,
  type NetworkClient,
  type ClientsResponse,
  type FirewallPolicy,
} from './types'
import { calculateTrafficStatus } from './traffic'

// Singleton Agent — scoped TLS bypass (D-02, D-03)
// rejectUnauthorized: false handles the console's self-signed cert only —
// this Agent is passed as `dispatcher` only to fetches targeting ${UNIFI_HOST}.
const agent = new Agent({
  connect: { rejectUnauthorized: false },
})

// D-09: UNIFI_HOST may include port (e.g., 192.168.1.1:8443)
// e.g. UNIFI_HOST=192.168.1.1 → https://192.168.1.1/proxy/...
// e.g. UNIFI_HOST=192.168.1.1:8443 → https://192.168.1.1:8443/proxy/...
function baseUrl(): string {
  return `https://${process.env.UNIFI_HOST}/proxy/network/v2/api/site/default`
}

/**
 * Transform UniFi API client to NetworkClient format
 * Per DEVI-03: Fallback chain: name -> hostname -> MAC
 */
function transformClient(apiClient: z.infer<typeof UnifiClientSchema>): NetworkClient {
  const displayName = apiClient.name ?? apiClient.hostname ?? apiClient.mac

  return {
    id: apiClient._id,
    mac: apiClient.mac,
    displayName,
    ip: apiClient.ip,
    lastSeen: apiClient.last_seen ? new Date(apiClient.last_seen) : null,
    isWired: apiClient.is_wired ?? false,
    isGuest: apiClient.is_guest ?? false,
    downloadRate: apiClient['rx_bytes-r'],
    uploadRate: apiClient['tx_bytes-r'],
    trafficStatus: calculateTrafficStatus(
      apiClient['rx_bytes-r'],
      apiClient['tx_bytes-r']
    ),
  }
}

/**
 * Get all network clients via UniFi direct LAN API
 * Per DEVI-01: Returns name, MAC, IP for each client
 * Per DEVI-02: Returns rx_bytes-r and tx_bytes-r for traffic calculation
 * Per DEVI-04: Returns last_seen timestamp
 *
 * Requires environment variables:
 * - UNIFI_HOST: Console LAN IP or hostname (e.g., 192.168.1.1 or 192.168.1.1:8443)
 * - UNIFI_API_KEY: API key from UniFi OS Settings > API
 */
export async function getUnifiClients(): Promise<ClientsResponse> {
  const host = process.env.UNIFI_HOST
  const apiKey = process.env.UNIFI_API_KEY

  if (!host || !apiKey) {
    throw new Error('UNIFI_HOST and UNIFI_API_KEY environment variables are required')
  }

  const response = await fetch(`${baseUrl()}/stat/sta`, {
    dispatcher: agent,
    signal: AbortSignal.timeout(10_000),
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`UniFi API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as unknown

  // Validate response with Zod schema (per threat model T-02-02)
  const clients = UnifiClientSchema.array().parse(data)

  return {
    clients: clients.map(transformClient),
    timestamp: Date.now(),
  }
}

/**
 * Schema for site feature migration response
 * Used internally to detect ZONE_BASED_FIREWALL feature
 */
const FeatureMigrationSchema = z.array(
  z.object({
    feature: z.string(),
    enabled: z.boolean(),
  })
)

/**
 * Check if Zone-Based Firewall is enabled on the UniFi console
 * Per D-10: Detect ZBF mode for UI adaptation
 *
 * @returns true if ZONE_BASED_FIREWALL feature is enabled, false otherwise
 *
 * Requires environment variables:
 * - UNIFI_HOST: Console LAN IP or hostname
 * - UNIFI_API_KEY: API key from UniFi OS Settings > API
 */
export async function isZoneBasedFirewallEnabled(): Promise<boolean> {
  const host = process.env.UNIFI_HOST
  const apiKey = process.env.UNIFI_API_KEY

  if (!host || !apiKey) {
    throw new Error('UNIFI_HOST and UNIFI_API_KEY environment variables are required')
  }

  const response = await fetch(`${baseUrl()}/site-feature-migration`, {
    dispatcher: agent,
    signal: AbortSignal.timeout(10_000),
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`UniFi API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as unknown
  const features = FeatureMigrationSchema.parse(data)
  return features.some(f => f.feature === 'ZONE_BASED_FIREWALL' && f.enabled === true)
}

/**
 * Get all firewall policies via UniFi direct LAN API
 * Per D-11: Returns policies for toggle UI
 * Per D-08: Minimal fields (_id, name, enabled) for display
 *
 * @returns Array of FirewallPolicy objects
 *
 * Requires environment variables:
 * - UNIFI_HOST: Console LAN IP or hostname
 * - UNIFI_API_KEY: API key from UniFi OS Settings > API
 */
export async function getFirewallPolicies(): Promise<FirewallPolicy[]> {
  const host = process.env.UNIFI_HOST
  const apiKey = process.env.UNIFI_API_KEY

  if (!host || !apiKey) {
    throw new Error('UNIFI_HOST and UNIFI_API_KEY environment variables are required')
  }

  const response = await fetch(`${baseUrl()}/firewall-policies`, {
    dispatcher: agent,
    signal: AbortSignal.timeout(10_000),
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`UniFi API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as unknown

  // Handle both wrapped { data: [...] } and direct array responses
  return FirewallPolicyResponseSchema.parse(data)
}

/**
 * Update a firewall policy's enabled state
 * Per D-13: Toggle enable/disable on existing policies
 *
 * @param policyId - The policy ID to update
 * @param enabled - The new enabled state
 * @returns The updated FirewallPolicy
 *
 * Requires environment variables:
 * - UNIFI_HOST: Console LAN IP or hostname
 * - UNIFI_API_KEY: API key from UniFi OS Settings > API
 */
export async function updateFirewallPolicy(
  policyId: string,
  enabled: boolean
): Promise<FirewallPolicy> {
  const host = process.env.UNIFI_HOST
  const apiKey = process.env.UNIFI_API_KEY

  if (!host || !apiKey) {
    throw new Error('UNIFI_HOST and UNIFI_API_KEY environment variables are required')
  }

  const response = await fetch(`${baseUrl()}/firewall-policies/${policyId}`, {
    dispatcher: agent,
    method: 'PUT',
    signal: AbortSignal.timeout(10_000),
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enabled }),
  })

  if (!response.ok) {
    throw new Error(`UniFi API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as unknown
  return FirewallPolicySchema.parse(data)
}
