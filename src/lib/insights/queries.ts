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

export interface HistoryBucket {
  hourTs: number  // unix timestamp (start of hour, UTC)
  avgMbps: number
}

/**
 * Returns exactly `hours` hourly buckets as a time series ending at the current
 * hour. Missing hours are filled with avgMbps=0.
 */
export function queryDeviceHistory(
  db: Database,
  mac: string,
  hours: number
): HistoryBucket[] {
  const rows = db
    .prepare<[string, number], { hourTs: number; avgMbps: number }>(
      `
      SELECT (recorded_at / 3600) * 3600 AS hourTs,
             (AVG(download_bps) + AVG(upload_bps)) * 8 / 1000000.0 AS avgMbps
      FROM snapshots
      WHERE client_mac = ?
        AND recorded_at >= strftime('%s','now') - (? * 3600)
      GROUP BY hourTs
      ORDER BY hourTs
      `
    )
    .all(mac, hours)

  const nowSec = Math.floor(Date.now() / 1000)
  const currentHourTs = Math.floor(nowSec / 3600) * 3600
  const startTs = currentHourTs - (hours - 1) * 3600

  const byHour = new Map<number, number>()
  for (const row of rows) {
    byHour.set(row.hourTs, row.avgMbps)
  }

  return Array.from({ length: hours }, (_, i) => {
    const ts = startTs + i * 3600
    return { hourTs: ts, avgMbps: byHour.get(ts) ?? 0 }
  })
}

/**
 * Returns exactly 24 hourly buckets (hour 0-23) for a given device over the
 * specified number of days. Missing hours are filled with avgMbps=0, active=false.
 *
 * download_bps/upload_bps store bytes/sec (per NetworkClient.downloadRate),
 * so converting to megabits/sec requires multiplying by 8:
 * avgMbps = (AVG(download_bps) + AVG(upload_bps)) * 8 / 1_000_000
 */
export function queryDeviceActivity(
  db: Database,
  mac: string,
  minutes: number,
  tzOffsetHours: number = 0
): HourlyBucket[] {
  const rows = db
    .prepare<[number, string, number], { hour: number; avgMbps: number }>(
      `
      SELECT CAST(strftime('%H', datetime(recorded_at + ? * 3600, 'unixepoch')) AS INTEGER) AS hour,
             (AVG(download_bps) + AVG(upload_bps)) * 8 / 1000000.0 AS avgMbps
      FROM snapshots
      WHERE client_mac = ?
        AND recorded_at >= strftime('%s','now') - (? * 60)
      GROUP BY hour
      ORDER BY hour
      `
    )
    .all(tzOffsetHours, mac, minutes)

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
