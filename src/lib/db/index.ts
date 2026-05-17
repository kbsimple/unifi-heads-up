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
