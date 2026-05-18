import type { Database } from 'better-sqlite3'

export interface TopDevice {
  mac: string
  totalBytes: number
  activeSeconds: number
  displayName?: string
}

export interface HourlyBucket {
  hour: number     // 0-23
  avgMbps: number
  active: boolean  // avgMbps >= 0.5
}

/**
 * Returns up to 20 devices ranked by total bytes (download + upload) descending
 * within the given number of days.
 *
 * Note: The snapshots table uses client_mac, download_bps, upload_bps columns.
 */
export function queryTopDevices(db: Database, minutes: number): TopDevice[] {
  const rows = db
    .prepare<[number], { mac: string; totalBytes: number; activeSeconds: number }>(
      `
      SELECT client_mac AS mac,
             SUM(download_bps + upload_bps) AS totalBytes,
             COUNT(*) * 60 AS activeSeconds
      FROM snapshots
      WHERE recorded_at >= strftime('%s','now') - (? * 60)
      GROUP BY client_mac
      ORDER BY totalBytes DESC
      LIMIT 20
      `
    )
    .all(minutes)

  return rows
}

/**
 * Returns exactly 24 hourly buckets (hour 0-23) for a given device over the
 * specified number of days. Missing hours are filled with avgMbps=0, active=false.
 *
 * avgMbps = (AVG(download_bps) + AVG(upload_bps)) / 1_000_000
 */
export function queryDeviceActivity(
  db: Database,
  mac: string,
  minutes: number
): HourlyBucket[] {
  const rows = db
    .prepare<[string, number], { hour: number; avgMbps: number }>(
      `
      SELECT CAST(strftime('%H', datetime(recorded_at, 'unixepoch')) AS INTEGER) AS hour,
             (AVG(download_bps) + AVG(upload_bps)) / 1000000.0 AS avgMbps
      FROM snapshots
      WHERE client_mac = ?
        AND recorded_at >= strftime('%s','now') - (? * 60)
      GROUP BY hour
      ORDER BY hour
      `
    )
    .all(mac, minutes)

  // Build a map for quick lookup
  const byHour = new Map<number, number>()
  for (const row of rows) {
    byHour.set(row.hour, row.avgMbps)
  }

  // Fill all 24 hours
  return Array.from({ length: 24 }, (_, hour) => {
    const avgMbps = byHour.get(hour) ?? 0
    return {
      hour,
      avgMbps,
      active: avgMbps >= 0.5,
    }
  })
}
