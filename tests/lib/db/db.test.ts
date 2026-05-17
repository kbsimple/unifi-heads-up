import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NetworkClient } from '@/lib/unifi/types'
import fs from 'node:fs'

// Helper to build a mock NetworkClient
function makeClient(overrides: Partial<NetworkClient> = {}): NetworkClient {
  return {
    id: 'client-1',
    mac: 'aa:bb:cc:dd:ee:ff',
    displayName: 'Test Device',
    ip: '192.168.1.100',
    lastSeen: new Date(),
    isWired: false,
    isGuest: false,
    downloadRate: 1024.7,
    uploadRate: 512.3,
    trafficStatus: 'low',
    ...overrides,
  }
}

describe('src/lib/db/index.ts', () => {
  let tmpPath: string
  let getDb: () => import('better-sqlite3').Database
  let insertSnapshots: (clients: NetworkClient[]) => void
  let purgeOldSnapshots: () => void

  beforeEach(async () => {
    tmpPath = `/tmp/test-snapshots-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
    process.env.SQLITE_PATH = tmpPath

    // Reset module registry so each test gets a fresh singleton
    vi.resetModules()

    const mod = await import('@/lib/db/index')
    getDb = mod.getDb
    insertSnapshots = mod.insertSnapshots
    purgeOldSnapshots = mod.purgeOldSnapshots
  })

  afterEach(() => {
    // Close DB and remove temp file
    try {
      const db = getDb()
      db.close()
    } catch {
      // ignore
    }
    try {
      fs.unlinkSync(tmpPath)
    } catch {
      // ignore if already gone
    }
  })

  describe('getDb()', () => {
    it('creates the db file on first call', () => {
      expect(fs.existsSync(tmpPath)).toBe(false)
      getDb()
      expect(fs.existsSync(tmpPath)).toBe(true)
    })

    it('creates the snapshots table with the correct schema', () => {
      const db = getDb()
      const tableInfo = db.prepare("PRAGMA table_info('snapshots')").all() as Array<{ name: string }>
      const cols = tableInfo.map((r) => r.name)
      expect(cols).toContain('id')
      expect(cols).toContain('client_mac')
      expect(cols).toContain('download_bps')
      expect(cols).toContain('upload_bps')
      expect(cols).toContain('recorded_at')
    })

    it('creates an index on recorded_at', () => {
      const db = getDb()
      const indexes = db.prepare("PRAGMA index_list('snapshots')").all() as Array<{ name: string }>
      const indexNames = indexes.map((i) => i.name)
      expect(indexNames).toContain('idx_recorded_at')
    })

    it('returns the same instance on repeated calls (singleton)', () => {
      const db1 = getDb()
      const db2 = getDb()
      expect(db1).toBe(db2)
    })
  })

  describe('insertSnapshots()', () => {
    it('inserts one row per client with correct values', () => {
      const before = Math.floor(Date.now() / 1000)
      const client = makeClient({ mac: 'aa:bb:cc:dd:ee:ff', downloadRate: 1024.7, uploadRate: 512.3 })
      insertSnapshots([client])
      const after = Math.floor(Date.now() / 1000)

      const db = getDb()
      const rows = db.prepare('SELECT * FROM snapshots').all() as Array<{
        client_mac: string
        download_bps: number
        upload_bps: number
        recorded_at: number
      }>
      expect(rows).toHaveLength(1)
      expect(rows[0].client_mac).toBe('aa:bb:cc:dd:ee:ff')
      expect(rows[0].download_bps).toBe(1025) // Math.round(1024.7)
      expect(rows[0].upload_bps).toBe(512)    // Math.round(512.3)
      expect(rows[0].recorded_at).toBeGreaterThanOrEqual(before)
      expect(rows[0].recorded_at).toBeLessThanOrEqual(after)
    })

    it('inserts multiple clients in a single call', () => {
      const clients = [
        makeClient({ mac: 'aa:bb:cc:dd:ee:01', downloadRate: 100, uploadRate: 50 }),
        makeClient({ mac: 'aa:bb:cc:dd:ee:02', downloadRate: 200, uploadRate: 100 }),
      ]
      insertSnapshots(clients)
      const db = getDb()
      const rows = db.prepare('SELECT * FROM snapshots ORDER BY client_mac').all() as Array<{ client_mac: string }>
      expect(rows).toHaveLength(2)
      expect(rows[0].client_mac).toBe('aa:bb:cc:dd:ee:01')
      expect(rows[1].client_mac).toBe('aa:bb:cc:dd:ee:02')
    })

    it('is a no-op when passed an empty array', () => {
      insertSnapshots([])
      const db = getDb()
      const rows = db.prepare('SELECT * FROM snapshots').all()
      expect(rows).toHaveLength(0)
    })

    it('calls purgeOldSnapshots after inserting (old rows are removed)', () => {
      const db = getDb()
      // Insert a row with an old recorded_at (31 days ago)
      const oldTs = Math.floor(Date.now() / 1000) - 31 * 24 * 60 * 60
      db.prepare('INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?,?,?,?)')
        .run('old:mac', 0, 0, oldTs)

      // Now insert a fresh client — should trigger purge
      insertSnapshots([makeClient()])

      const rows = db.prepare('SELECT * FROM snapshots').all() as Array<{ client_mac: string }>
      const macs = rows.map((r) => r.client_mac)
      expect(macs).not.toContain('old:mac')
    })
  })

  describe('purgeOldSnapshots()', () => {
    it('deletes rows older than 30 days', () => {
      const db = getDb()
      const nowSeconds = Math.floor(Date.now() / 1000)
      const oldTs = nowSeconds - 31 * 24 * 60 * 60
      const recentTs = nowSeconds - 1 * 24 * 60 * 60

      db.prepare('INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?,?,?,?)')
        .run('old:mac', 0, 0, oldTs)
      db.prepare('INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?,?,?,?)')
        .run('recent:mac', 0, 0, recentTs)

      purgeOldSnapshots()

      const rows = db.prepare('SELECT * FROM snapshots').all() as Array<{ client_mac: string }>
      const macs = rows.map((r) => r.client_mac)
      expect(macs).not.toContain('old:mac')
      expect(macs).toContain('recent:mac')
    })

    it('keeps rows exactly at the 30-day boundary', () => {
      const db = getDb()
      // Exactly 30 days ago (should be kept)
      const exactTs = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
      db.prepare('INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?,?,?,?)')
        .run('boundary:mac', 0, 0, exactTs)

      purgeOldSnapshots()

      const rows = db.prepare('SELECT * FROM snapshots').all() as Array<{ client_mac: string }>
      const macs = rows.map((r) => r.client_mac)
      expect(macs).toContain('boundary:mac')
    })
  })
})
