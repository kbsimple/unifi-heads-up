// src/lib/unifi/types.ts
import { z } from 'zod'

/**
 * Zod schema for UniFi API client response
 * Validates the raw API response from Site Manager Proxy
 */
export const UnifiClientSchema = z.object({
  _id: z.string(),
  mac: z.string(),
  name: z.string().nullish(),
  hostname: z.string().nullish(),
  oui: z.string().nullish(),
  ip: z.string().nullish(),
  last_seen: z.number().nullish(),
  is_wired: z.boolean().nullish(),
  is_guest: z.boolean().nullish(),
  // Real-time bandwidth rate fields (bytes per second)
  'rx_bytes-r': z.number().default(0),
  'tx_bytes-r': z.number().default(0),
  // WiFi signal strength in dBm (null for wired clients)
  signal: z.number().nullish(),
})

/**
 * Raw UniFi client from API response
 */
export type UnifiClient = z.infer<typeof UnifiClientSchema>

/**
 * Transformed client data for UI consumption
 * Per DEVI-01: View clients with name, MAC, IP
 * Per DEVI-03: Device name fallback chain (name -> hostname -> MAC)
 * Per DEVI-04: Last active timestamp
 */
export interface NetworkClient {
  id: string
  mac: string
  // Per DEVI-03: Fallback chain: name -> hostname -> MAC
  displayName: string
  ip: string | null
  lastSeen: Date | null
  isWired: boolean
  isGuest: boolean
  // Bandwidth in bytes per second
  downloadRate: number
  uploadRate: number
  // WiFi signal strength in dBm; null for wired clients
  signal: number | null
  // Per DEVI-02: Traffic status
  trafficStatus: 'idle' | 'low' | 'medium' | 'high'
  // Unix ms of last snapshot where combined bandwidth >= 1 Mbps (from DB). Null if no history.
  lastBusy: number | null
}

/**
 * API response wrapper for clients list
 */
export interface ClientsResponse {
  clients: NetworkClient[]
  timestamp: number
}

/**
 * UniFi native schedule field shapes (observed from live API — RESEARCH.md)
 * passthrough() on the ALWAYS variant preserves unknown fields (e.g. repeat_on_days)
 * without failing validation.
 */
export const UnifiScheduleSchema = z.union([
  z.object({ mode: z.literal('ALWAYS') }).passthrough(),
  z.object({
    mode: z.literal('ONE_TIME_ONLY'),
    date: z.string(),
    time_range_start: z.string(),
    time_range_end: z.string(),
  }),
])

export type UnifiSchedule = z.infer<typeof UnifiScheduleSchema>

/**
 * Zod schema for a ZBF firewall policy endpoint (source or destination).
 * Phase 13: Typed so mapping logic can access client_macs without casting.
 */
export const FirewallPolicyEndpointSchema = z.object({
  client_macs: z.array(z.string()).optional(),
  zone_id: z.string().optional(),
  matching_target: z.string().optional(),
})

export type FirewallPolicyEndpoint = z.infer<typeof FirewallPolicyEndpointSchema>

/**
 * Zod schema for UniFi firewall policy
 * Per D-08: Minimal display fields only - _id, name, enabled
 * Phase 11: Extended with optional schedule (raw from API) and scheduleEnd (computed Unix ms)
 * Phase 13: Extended with typed source/destination for ZBF MAC matching
 */
export const FirewallPolicySchema = z.object({
  _id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  schedule: UnifiScheduleSchema.optional(),
  // Computed field: Unix ms of schedule end time. Set by getFirewallPolicies()
  // from schedule.mode === 'ONE_TIME_ONLY' date + time_range_end. Not from API.
  scheduleEnd: z.number().optional(),
  source: FirewallPolicyEndpointSchema.optional(),
  destination: FirewallPolicyEndpointSchema.optional(),
}).passthrough()

/**
 * Firewall policy from UniFi API
 * Per D-08: Minimal fields for toggle UI
 */
export type FirewallPolicy = z.infer<typeof FirewallPolicySchema>

/**
 * Schema for firewall policy API responses
 * Handles both wrapped { data: [...] } and direct array responses
 * Per D-11: API may return either format
 */
export const FirewallPolicyResponseSchema = z.union([
  // Wrapped response: { data: [...] }
  z.object({
    data: z.array(FirewallPolicySchema),
  }).transform(obj => obj.data),
  // Direct array response: [...]
  z.array(FirewallPolicySchema),
])