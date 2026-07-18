// Standalone DPI probe — calls the UniFi stadpi endpoint and decodes responses.
// Not wired into the UniFi client facade (client.ts / index.ts).
// Phase 18 only: validation tool. Promote to facade in a future phase if DPI ships.
import 'server-only'
import { fetch, Agent } from 'undici'
import { decodeAppId } from './lookup'

// Scoped Agent — same pattern as statusz.ts and client.ts.
// rejectUnauthorized: false handles the console's self-signed cert.
// dispatcher is passed only to fetches targeting UNIFI_HOST.
const dpiAgent = new Agent({ connect: { rejectUnauthorized: false } })

// Always use the v1 base path for stadpi — no v2 equivalent exists.
function stadpiUrl(): string {
  return `https://${process.env.UNIFI_HOST}/proxy/network/api/s/default/stat/stadpi`
}

// --- Types ---

export interface DpiAppEntry {
  app: number
  cat: number
  rx_bytes: number
  tx_bytes: number
  rx_packets: number
  tx_packets: number
}

export interface DpiClientData {
  mac: string
  last_updated: number
  by_app: DpiAppEntry[]
  by_cat: DpiAppEntry[]
}

export interface DpiRawResponse {
  meta: { rc: string }
  data: Partial<DpiClientData>[]
}

export interface DecodedApp {
  app: number
  cat: number
  compoundId: number
  appName: string
  catName: string
  rx_bytes: number
  tx_bytes: number
  rx_packets: number
  tx_packets: number
}

export type DpiProbeStatus = 'ok' | 'dpi_disabled' | 'no_data' | 'error'

export interface DpiProbeResult {
  status: DpiProbeStatus
  raw: unknown
  decoded: DecodedApp[]
  mock?: true
}

// --- Helpers (exported for unit testing) ---

/**
 * Determine DPI status from raw API response.
 *
 * 'dpi_disabled' — data is empty OR data[0] has no by_app key
 *   (both happen when DPI is off in Settings → Traffic Management → Deep Packet Inspection)
 * 'no_data'      — DPI on, but no traffic recorded for this device yet
 * 'ok'           — at least one app entry present
 */
export function inferStatus(raw: DpiRawResponse): DpiProbeStatus {
  if (!raw?.data || raw.data.length === 0) return 'dpi_disabled'
  const first = raw.data[0]
  // data[0] === {} when DPI is disabled (no by_app key at all)
  if (!first || !('by_app' in first)) return 'dpi_disabled'
  // by_app present but empty when DPI on but device has no traffic
  if (!first.by_app || first.by_app.length === 0) return 'no_data'
  return 'ok'
}

/**
 * Decode each by_app entry from the raw response into human-readable form.
 * Returns [] when there are no app entries (DPI disabled, no data, etc.).
 */
export function decodeDpiResponse(raw: DpiRawResponse): DecodedApp[] {
  const first = raw?.data?.[0]
  if (!first?.by_app || first.by_app.length === 0) return []
  return first.by_app.map((entry) => {
    const lookup = decodeAppId(entry.cat, entry.app)
    return {
      app: entry.app,
      cat: entry.cat,
      compoundId: lookup.compoundId,
      appName: lookup.appName,
      catName: lookup.catName,
      rx_bytes: entry.rx_bytes,
      tx_bytes: entry.tx_bytes,
      rx_packets: entry.rx_packets,
      tx_packets: entry.tx_packets,
    }
  })
}

// --- Public API ---

/**
 * Call the UniFi stadpi endpoint and return structured probe result.
 * Uses the module-level dpiAgent (scoped TLS bypass) and X-API-KEY auth.
 * 10s timeout — matches other UniFi API calls in client.ts.
 */
export async function probeDpi(macs: string[]): Promise<DpiProbeResult> {
  const apiKey = process.env.UNIFI_API_KEY
  if (!apiKey) {
    return {
      status: 'error',
      raw: { error: 'UNIFI_API_KEY not set' },
      decoded: [],
    }
  }

  try {
    const res = await fetch(stadpiUrl(), {
      method: 'POST',
      dispatcher: dpiAgent,
      signal: AbortSignal.timeout(10_000),
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'by_app', macs }),
    })

    const raw = (await res.json()) as DpiRawResponse
    return {
      status: inferStatus(raw),
      raw,
      decoded: decodeDpiResponse(raw),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      status: 'error',
      raw: { error: 'FETCH_FAILED', message },
      decoded: [],
    }
  }
}

/**
 * Return a realistic mock DPI result when UNIFI_MOCK=true.
 * Uses verified compound IDs from cat_app.json:
 *   Youtube  → cat=4, app=112 (compound 262256)
 *   Netflix  → cat=4, app=132 (compound 262276) — NOT 113; verified from ubntwiki
 *   Slack    → cat=0, app=39  (compound 39)
 */
export function probeDpiMock(macs: string[]): DpiProbeResult {
  const mac = macs[0] ?? 'aa:bb:cc:dd:ee:01'
  const mockApps: DpiAppEntry[] = [
    { app: 112, cat: 4, rx_bytes: 1_500_000_000, tx_bytes: 50_000_000, rx_packets: 1_000_000, tx_packets: 100_000 },
    { app: 132, cat: 4, rx_bytes: 800_000_000,   tx_bytes: 30_000_000, rx_packets: 600_000,   tx_packets: 60_000 },
    { app: 39,  cat: 0, rx_bytes: 120_000_000,   tx_bytes: 15_000_000, rx_packets: 200_000,   tx_packets: 40_000 },
  ]
  const raw: DpiRawResponse = {
    meta: { rc: 'ok' },
    data: [{
      mac,
      last_updated: Math.floor(Date.now() / 1000),
      by_app: mockApps,
      by_cat: [],
    }],
  }
  return {
    status: 'ok',
    raw,
    decoded: decodeDpiResponse(raw),
    mock: true,
  }
}
