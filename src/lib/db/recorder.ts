import 'server-only'

import { getUnifiClients } from '@/lib/unifi'
import { insertSnapshots } from '@/lib/db'

let started = false

export function startRecorder(): void {
  if (started) return
  started = true

  setInterval(async () => {
    try {
      const { clients } = await getUnifiClients()
      insertSnapshots(clients)
    } catch (err) {
      console.error('[recorder] snapshot failed', err)
    }
  }, 60_000)
}
