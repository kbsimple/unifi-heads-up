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
  type UnifiSchedule,
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

// Older firmware exposes clients at /proxy/network/api/s/default instead of the v2 path
function clientsUrl(): string {
  const apiVersion = process.env.UNIFI_API_VERSION ?? 'v2'
  if (apiVersion === 'v1') {
    return `https://${process.env.UNIFI_HOST}/proxy/network/api/s/default`
  }
  return baseUrl()
}

// Strips common corporate suffixes from OUI manufacturer strings
function cleanOui(oui: string): string {
  return oui
    .replace(/,?\s*(Co\.?,?\s*Ltd\.?|Inc\.?|LLC\.?|Corp\.?|Limited|Interactive,?\s*Inc\.?|Technologies\s*Inc\.?|Electronics\s*Co\.?,?\s*Ltd\.?)$/i, '')
    .trim()
}

// Returns true for hostnames that look like human-assigned names rather than
// auto-generated serials/hashes (e.g. rejects "09AA01AC271502VB", "e85b24300c4fedf5efb1...")
function isReadableHostname(hostname: string): boolean {
  if (/^[A-Z0-9]{8,}$/.test(hostname)) return false   // all-caps serial
  if (/^[a-f0-9]{16,}$/.test(hostname)) return false  // lowercase hex hash / UUID without dashes
  if (hostname.length >= 32) return false              // anything ≥32 chars is likely a hash
  return true
}

// OUI cache — persists for server lifetime to avoid repeated external lookups
const ouiCache = new Map<string, string>()

async function fetchOuiVendor(mac: string): Promise<string> {
  const prefix = mac.slice(0, 8)
  if (ouiCache.has(prefix)) return ouiCache.get(prefix)!
  try {
    const resp = await globalThis.fetch(`https://api.macvendors.com/${mac}`, {
      signal: AbortSignal.timeout(3_000),
    })
    const vendor = resp.ok ? (await resp.text()).trim() : ''
    ouiCache.set(prefix, vendor)
    return vendor
  } catch {
    ouiCache.set(prefix, '')
    return ''
  }
}

function resolveDisplayName(apiClient: z.infer<typeof UnifiClientSchema>): string {
  if (apiClient.name) return apiClient.name
  if (apiClient.hostname && isReadableHostname(apiClient.hostname)) return apiClient.hostname
  const macSuffix = apiClient.mac.slice(-5) // last 4 hex + colon, e.g. "0b:50"
  if (apiClient.oui) return `${cleanOui(apiClient.oui)} ${macSuffix}`
  return apiClient.mac
}

/**
 * Transform UniFi API client to NetworkClient format
 * Per DEVI-03: Fallback chain: name -> hostname -> oui+mac -> mac
 */
function transformClient(apiClient: z.infer<typeof UnifiClientSchema>): NetworkClient {
  const displayName = resolveDisplayName(apiClient)

  return {
    id: apiClient._id,
    mac: apiClient.mac,
    displayName,
    ip: apiClient.ip ?? null,
    lastSeen: apiClient.last_seen ? new Date(apiClient.last_seen * 1000) : null,
    isWired: apiClient.is_wired ?? false,
    isGuest: apiClient.is_guest ?? false,
    downloadRate: apiClient['rx_bytes-r'],
    uploadRate: apiClient['tx_bytes-r'],
    signal: apiClient.signal ?? null,
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

  const response = await fetch(`${clientsUrl()}/stat/sta`, {
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

  // v1 API wraps results: { data: [...], meta: { rc: "ok" } }
  // v2 API returns a plain array
  const raw = (data && typeof data === 'object' && 'data' in (data as object))
    ? (data as { data: unknown }).data
    : data

  const parsed = UnifiClientSchema.array().parse(raw)

  const enriched = await Promise.all(
    parsed.map(async (c) => {
      if (c.oui) return c
      const vendor = await fetchOuiVendor(c.mac)
      return vendor ? { ...c, oui: vendor } : c
    })
  )

  return {
    clients: enriched.map(transformClient),
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
 * Compute Unix ms end time from a UniFi schedule field.
 * Returns undefined for ALWAYS mode or missing schedule.
 */
function scheduleEndFromSchedule(schedule: UnifiSchedule | undefined): number | undefined {
  if (!schedule || schedule.mode !== 'ONE_TIME_ONLY') return undefined
  const dt = new Date(`${schedule.date}T${schedule.time_range_end}`)
  return isNaN(dt.getTime()) ? undefined : dt.getTime()
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
  const policies = FirewallPolicyResponseSchema.parse(data)
  return policies.map(p => ({
    ...p,
    scheduleEnd: scheduleEndFromSchedule(p.schedule),
  }))
}

/**
 * Update a firewall policy's enabled state
 * Per D-13: Toggle enable/disable on existing policies
 *
 * UniFi's PUT /firewall-policies/{id} uses full-replacement semantics — sending
 * only { enabled } results in a 4xx error because required fields are missing.
 * This function GETs the current full policy object, merges the new enabled
 * value, and PUTs the complete object back.
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
  enabled: boolean,
  schedule?: UnifiSchedule
): Promise<FirewallPolicy> {
  const host = process.env.UNIFI_HOST
  const apiKey = process.env.UNIFI_API_KEY

  if (!host || !apiKey) {
    throw new Error('UNIFI_HOST and UNIFI_API_KEY environment variables are required')
  }

  const headers = {
    'X-API-KEY': apiKey,
    'Content-Type': 'application/json',
  }

  // Step 1: GET the current full policy object to preserve all fields
  // (UniFi PUT requires the full object — partial PATCH is not supported)
  const getResponse = await fetch(`${baseUrl()}/firewall-policies/${policyId}`, {
    dispatcher: agent,
    signal: AbortSignal.timeout(10_000),
    headers,
  })

  if (!getResponse.ok) {
    const body = await getResponse.text().catch(() => '(unreadable)')
    throw new Error(
      `UniFi API error fetching policy ${policyId}: ${getResponse.status} ${getResponse.statusText} — ${body}`
    )
  }

  const currentPolicy = await getResponse.json() as unknown

  // Step 2: Merge the new enabled value into the full policy object
  if (!currentPolicy || typeof currentPolicy !== 'object') {
    throw new Error(`UniFi API returned unexpected shape for policy ${policyId}`)
  }
  const updatedPolicy = {
    ...(currentPolicy as Record<string, unknown>),
    enabled,
    ...(schedule !== undefined ? { schedule } : {}),
  }

  // Step 3: PUT the full object back
  const putResponse = await fetch(`${baseUrl()}/firewall-policies/${policyId}`, {
    dispatcher: agent,
    method: 'PUT',
    signal: AbortSignal.timeout(10_000),
    headers,
    body: JSON.stringify(updatedPolicy),
  })

  if (!putResponse.ok) {
    const body = await putResponse.text().catch(() => '(unreadable)')
    throw new Error(
      `UniFi API error updating policy ${policyId}: ${putResponse.status} ${putResponse.statusText} — ${body}`
    )
  }

  const data = await putResponse.json() as unknown
  return FirewallPolicySchema.parse(data)
}
