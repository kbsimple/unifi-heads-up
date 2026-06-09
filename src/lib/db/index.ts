import 'server-only'

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

import type { NetworkClient } from '@/lib/unifi/types'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = process.env.SQLITE_PATH ?? './data/snapshots.db'
  const dir = path.dirname(dbPath)
  fs.mkdirSync(dir, { recursive: true })

  db = new Database(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_mac TEXT NOT NULL,
      download_bps INTEGER NOT NULL,
      upload_bps INTEGER NOT NULL,
      recorded_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_recorded_at ON snapshots (recorded_at);
    CREATE INDEX IF NOT EXISTS idx_snapshots_mac_at ON snapshots (client_mac, recorded_at DESC);

    CREATE TABLE IF NOT EXISTS starred_rules (
      rule_id TEXT PRIMARY KEY,
      starred_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS latest_clients (
      id TEXT PRIMARY KEY,
      mac TEXT NOT NULL,
      display_name TEXT NOT NULL,
      ip TEXT,
      last_seen INTEGER,
      is_wired INTEGER NOT NULL,
      is_guest INTEGER NOT NULL,
      download_rate INTEGER NOT NULL,
      upload_rate INTEGER NOT NULL,
      signal INTEGER,
      traffic_status TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_latest_clients_updated ON latest_clients (updated_at);
  `)

  return db
}

export function insertSnapshots(clients: NetworkClient[]): void {
  if (clients.length === 0) return

  const database = getDb()
  const insert = database.prepare(
    'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
  )
  const now = Math.floor(Date.now() / 1000)

  const insertAll = database.transaction((rows: NetworkClient[]) => {
    for (const client of rows) {
      insert.run(client.mac, Math.round(client.downloadRate), Math.round(client.uploadRate), now)
    }
  })

  insertAll(clients)
  purgeOldSnapshots()
}

export function purgeOldSnapshots(): void {
  const database = getDb()
  const cutoff = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
  database.prepare('DELETE FROM snapshots WHERE recorded_at < ?').run(cutoff)
}

/**
 * Upsert latest clients cache - replaces all existing entries with fresh data.
 * Called by the background recorder after each successful UniFi poll.
 */
export function upsertLatestClients(clients: NetworkClient[]): void {
  const database = getDb()
  const now = Date.now()

  const upsertAll = database.transaction((rows: NetworkClient[]) => {
    // Always clear cache first — ensures getLatestClients returns null if poll
    // returned zero clients, rather than silently serving stale data.
    database.prepare('DELETE FROM latest_clients').run()
    if (rows.length === 0) return

    // Insert all clients
    const insert = database.prepare(`
      INSERT INTO latest_clients (
        id, mac, display_name, ip, last_seen, is_wired, is_guest,
        download_rate, upload_rate, signal, traffic_status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const client of rows) {
      insert.run(
        client.id,
        client.mac,
        client.displayName,
        client.ip,
        client.lastSeen ? Math.floor(client.lastSeen.getTime() / 1000) : null,
        client.isWired ? 1 : 0,
        client.isGuest ? 1 : 0,
        Math.round(client.downloadRate),
        Math.round(client.uploadRate),
        client.signal,
        client.trafficStatus,
        now
      )
    }
  })

  upsertAll(clients)
}

/**
 * Get latest clients from cache.
 * Returns null if cache is empty or older than maxAgeMs (default 5 minutes).
 */
export function getLatestClients(
  maxAgeMs: number = 5 * 60 * 1000
): { clients: NetworkClient[]; timestamp: number } | null {
  const database = getDb()

  // Get the most recent update timestamp
  const timestampRow = database.prepare(
    'SELECT MAX(updated_at) as ts FROM latest_clients'
  ).get() as { ts: number | null }

  if (!timestampRow?.ts) {
    return null
  }

  const timestamp = timestampRow.ts

  // Check cache age
  const age = Date.now() - timestamp
  if (age > maxAgeMs) {
    return null // Cache is stale
  }

  // Fetch all clients
  const rows = database.prepare(`
    SELECT
      id, mac, display_name, ip, last_seen, is_wired, is_guest,
      download_rate, upload_rate, signal, traffic_status
    FROM latest_clients
  `).all() as Array<{
    id: string
    mac: string
    display_name: string
    ip: string | null
    last_seen: number | null
    is_wired: number
    is_guest: number
    download_rate: number
    upload_rate: number
    signal: number | null
    traffic_status: string
  }>

  if (rows.length === 0) {
    return null
  }

  const clients: NetworkClient[] = rows.map((row) => ({
    id: row.id,
    mac: row.mac,
    displayName: row.display_name,
    ip: row.ip,
    lastSeen: row.last_seen ? new Date(row.last_seen * 1000) : null,
    isWired: row.is_wired === 1,
    isGuest: row.is_guest === 1,
    downloadRate: row.download_rate,
    uploadRate: row.upload_rate,
    signal: row.signal,
    trafficStatus: row.traffic_status as NetworkClient['trafficStatus'],
  }))

  return { clients, timestamp }
}

export function getRecentAvgRates(
  macs: string[],
  window: number
): Map<string, { avgDownload: number; avgUpload: number }> {
  if (macs.length === 0) return new Map()

  const database = getDb()
  const placeholders = macs.map(() => '?').join(',')

  const rows = database.prepare(`
    WITH ranked AS (
      SELECT client_mac, download_bps, upload_bps,
        ROW_NUMBER() OVER (PARTITION BY client_mac ORDER BY recorded_at DESC) AS rn
      FROM snapshots
      WHERE client_mac IN (${placeholders})
    )
    SELECT client_mac, AVG(download_bps) AS avg_download, AVG(upload_bps) AS avg_upload
    FROM ranked
    WHERE rn <= ?
    GROUP BY client_mac
  `).all([...macs, window]) as Array<{ // params: ...macs, then window
    client_mac: string
    avg_download: number
    avg_upload: number
  }>

  return new Map(rows.map(r => [r.client_mac, {
    avgDownload: r.avg_download,
    avgUpload: r.avg_upload,
  }]))
}
