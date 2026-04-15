// src/lib/unifi/types.ts
import { z } from 'zod'

/**
 * Zod schema for UniFi API client response
 * Validates the raw API response from Site Manager Proxy
 */
export const UnifiClientSchema = z.object({
  _id: z.string(),
  mac: z.string(),
  name: z.string().nullable(),
  hostname: z.string().nullable(),
  ip: z.string().nullable(),
  last_seen: z.number().nullable(),
  is_wired: z.boolean().nullable(),
  is_guest: z.boolean().nullable(),
  // Real-time bandwidth rate fields (bytes per second)
  'rx_bytes-r': z.number().default(0),
  'tx_bytes-r': z.number().default(0),
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
  // Per DEVI-02: Traffic status
  trafficStatus: 'idle' | 'low' | 'medium' | 'high'
}

/**
 * API response wrapper for clients list
 */
export interface ClientsResponse {
  clients: NetworkClient[]
  timestamp: number
}