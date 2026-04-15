// src/lib/unifi/client.ts
import 'server-only'
import ky from 'ky'
import { z } from 'zod'
import { UnifiClientSchema, type NetworkClient, type ClientsResponse } from './types'
import { calculateTrafficStatus } from './traffic'

const SITE_MANAGER_BASE = 'https://api.ui.com'

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
 * Get all network clients via UniFi Site Manager Proxy
 * Per DEVI-01: Returns name, MAC, IP for each client
 * Per DEVI-02: Returns rx_bytes-r and tx_bytes-r for traffic calculation
 * Per DEVI-04: Returns last_seen timestamp
 *
 * Requires environment variables:
 * - UNIFI_CONSOLE_ID: Console ID from Site Manager URL
 * - UNIFI_API_KEY: Site Manager API key
 */
export async function getUnifiClients(): Promise<ClientsResponse> {
  const consoleId = process.env.UNIFI_CONSOLE_ID
  const apiKey = process.env.UNIFI_API_KEY

  if (!consoleId || !apiKey) {
    throw new Error('UNIFI_CONSOLE_ID and UNIFI_API_KEY environment variables are required')
  }

  const response = await ky
    .get(`${SITE_MANAGER_BASE}/proxy/network/v2/api/site/default/stat/sta`, {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    })
    .json<unknown>()

  // Validate response with Zod schema (per threat model T-02-02)
  const clients = UnifiClientSchema.array().parse(response)

  return {
    clients: clients.map(transformClient),
    timestamp: Date.now(),
  }
}