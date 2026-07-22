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
/**
 * Returns a map of client_mac → Unix milliseconds for the most recent snapshot
 * where combined bandwidth >= 125000 bytes/sec (1 Mbps = medium threshold).
 * Used to seed the dashboard "Last Busy" column from persistent history.
 */
export function queryAllLastBusy(db: Database): Record<string, number> {
  const rows = db
    .prepare<[], { mac: string; last_busy_sec: number }>(
      `SELECT client_mac AS mac, MAX(recorded_at) AS last_busy_sec
       FROM snapshots
       WHERE download_bps + upload_bps >= 125000
       GROUP BY client_mac`
    )
    .all()

  const result: Record<string, number> = {}
  for (const row of rows) {
    result[row.mac] = row.last_busy_sec * 1000
  }
  return result
}

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
  bucketTs: number  // unix seconds (start of bucket)
  avgMbps: number | null  // null when no measurements exist for this bucket
}

export const VALID_WINDOWS = [5, 30, 60, 180, 720, 1440] as const
export type WindowMinutes = typeof VALID_WINDOWS[number]

const BUCKET_SECONDS: Record<number, number> = {
  5:    60,
  30:   60,
  60:   300,
  180:  300,
  720:  900,
  1440: 3600,
}

export function bucketSecondsForWindow(windowMinutes: number): number {
  return BUCKET_SECONDS[windowMinutes] ?? 3600
}

function fillBuckets(
  rows: Array<{ bucketTs: number; avgMbps: number }>,
  windowSec: number,
  bucketSec: number
): HistoryBucket[] {
  const nowSec = Math.floor(Date.now() / 1000)
  const startBucket = Math.floor((nowSec - windowSec) / bucketSec) * bucketSec
  const endBucket = Math.floor(nowSec / bucketSec) * bucketSec
  const count = Math.floor((endBucket - startBucket) / bucketSec) + 1

  const byBucket = new Map<number, number>()
  for (const row of rows) {
    byBucket.set(row.bucketTs, row.avgMbps)
  }

  return Array.from({ length: count }, (_, i) => {
    const ts = startBucket + i * bucketSec
    return { bucketTs: ts, avgMbps: byBucket.get(ts) ?? null }
  })
}

export function queryDeviceHistoryRecent(
  db: Database,
  mac: string,
  windowMinutes: number
): HistoryBucket[] {
  const bucketSec = bucketSecondsForWindow(windowMinutes)
  const windowSec = windowMinutes * 60

  const rows = db
    .prepare<[number, number, string, number], { bucketTs: number; avgMbps: number }>(
      `SELECT (recorded_at / CAST(? AS INTEGER)) * CAST(? AS INTEGER) AS bucketTs,
              (AVG(download_bps) + AVG(upload_bps)) * 8 / 1000000.0 AS avgMbps
       FROM snapshots
       WHERE client_mac = ?
         AND recorded_at >= CAST(strftime('%s','now') AS INTEGER) - ?
       GROUP BY bucketTs
       ORDER BY bucketTs`
    )
    .all(bucketSec, bucketSec, mac, windowSec)

  return fillBuckets(rows, windowSec, bucketSec)
}

export function querySiteHistoryRecent(
  db: Database,
  windowMinutes: number
): HistoryBucket[] {
  const bucketSec = bucketSecondsForWindow(windowMinutes)
  const windowSec = windowMinutes * 60

  const rows = db
    .prepare<[number, number, number], { bucketTs: number; avgMbps: number }>(
      `SELECT (recorded_at / CAST(? AS INTEGER)) * CAST(? AS INTEGER) AS bucketTs,
              (SUM(download_bps) + SUM(upload_bps)) * 8 / 1000000.0 AS avgMbps
       FROM snapshots
       WHERE recorded_at >= CAST(strftime('%s','now') AS INTEGER) - ?
       GROUP BY bucketTs
       ORDER BY bucketTs`
    )
    .all(bucketSec, bucketSec, windowSec)

  return fillBuckets(rows, windowSec, bucketSec)
}

export function queryDeviceHistory(
  db: Database,
  mac: string,
  hours: number
): HistoryBucket[] {
  return queryDeviceHistoryRecent(db, mac, hours * 60)
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
