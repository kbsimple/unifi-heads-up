import 'server-only'

import { getUnifiClients } from '@/lib/unifi'
import { insertSnapshots, upsertLatestClients, getRecentAvgRates } from '@/lib/db'
import { calculateTrafficStatus } from '@/lib/unifi/traffic'
import type { NetworkClient } from '@/lib/unifi/types'

// Number of recent snapshots to average when classifying traffic status.
// Increase to smooth more aggressively; decrease to react faster to changes.
export const SNAPSHOT_WINDOW = 2

let started = false

export function _resetForTests(): void {
  started = false
}

export function startRecorder(): void {
  if (started) return
  started = true

  setInterval(async () => {
    try {
      const { clients } = await getUnifiClients()
      insertSnapshots(clients)

      const avgRates = getRecentAvgRates(clients.map(c => c.mac), SNAPSHOT_WINDOW)
      const smoothed = clients.map((client): NetworkClient => {
        const rates = avgRates.get(client.mac)
        if (!rates) return client
        return {
          ...client,
          trafficStatus: calculateTrafficStatus(rates.avgDownload, rates.avgUpload),
        }
      })

      upsertLatestClients(smoothed)
    } catch (err) {
      console.error('[recorder] snapshot failed', err)
    }
  }, 60_000)
}
