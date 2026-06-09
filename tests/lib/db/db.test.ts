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
    signal: null,
    trafficStatus: 'low',
    ...overrides,
  }
}

describe('src/lib/db/index.ts', () => {
  let tmpPath: string
  let getDb: () => import('better-sqlite3').Database
  let insertSnapshots: (clients: NetworkClient[]) => void
  let purgeOldSnapshots: () => void
  let getRecentAvgRates: (macs: string[], window: number) => Map<string, { avgDownload: number; avgUpload: number }>

  beforeEach(async () => {
    tmpPath = `/tmp/test-snapshots-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
    process.env.SQLITE_PATH = tmpPath

    // Reset module registry so each test gets a fresh singleton
    vi.resetModules()

    const mod = await import('@/lib/db/index')
    getDb = mod.getDb
    insertSnapshots = mod.insertSnapshots
    purgeOldSnapshots = mod.purgeOldSnapshots
    getRecentAvgRates = mod.getRecentAvgRates
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

  describe('getRecentAvgRates()', () => {
    function insertRaw(mac: string, downloadBps: number, uploadBps: number, recordedAt: number) {
      getDb().prepare(
        'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?,?,?,?)'
      ).run(mac, downloadBps, uploadBps, recordedAt)
    }

    it('returns an empty Map for an empty macs array', () => {
      const result = getRecentAvgRates([], 3)
      expect(result.size).toBe(0)
    })

    it('returns correct average for a single client with multiple snapshots', () => {
      const now = Math.floor(Date.now() / 1000)
      insertRaw('aa:bb:cc:00:00:01', 1000, 500, now - 120)
      insertRaw('aa:bb:cc:00:00:01', 3000, 1500, now - 60)
      insertRaw('aa:bb:cc:00:00:01', 5000, 2500, now)

      const result = getRecentAvgRates(['aa:bb:cc:00:00:01'], 3)
      const rates = result.get('aa:bb:cc:00:00:01')
      expect(rates).toBeDefined()
      expect(rates!.avgDownload).toBeCloseTo((1000 + 3000 + 5000) / 3)
      expect(rates!.avgUpload).toBeCloseTo((500 + 1500 + 2500) / 3)
    })

    it('window=2 uses only the 2 most recent snapshots, ignoring older ones', () => {
      const now = Math.floor(Date.now() / 1000)
      insertRaw('aa:bb:cc:00:00:02', 100, 50, now - 180) // oldest — excluded
      insertRaw('aa:bb:cc:00:00:02', 2000, 1000, now - 60) // 2nd most recent
      insertRaw('aa:bb:cc:00:00:02', 4000, 2000, now)      // most recent

      const result = getRecentAvgRates(['aa:bb:cc:00:00:02'], 2)
      const rates = result.get('aa:bb:cc:00:00:02')
      expect(rates).toBeDefined()
      expect(rates!.avgDownload).toBeCloseTo((2000 + 4000) / 2)
      expect(rates!.avgUpload).toBeCloseTo((1000 + 2000) / 2)
    })

    it('client with only 1 snapshot returns a result (average of 1 row)', () => {
      const now = Math.floor(Date.now() / 1000)
      insertRaw('aa:bb:cc:00:00:03', 8000, 4000, now)

      const result = getRecentAvgRates(['aa:bb:cc:00:00:03'], 2)
      const rates = result.get('aa:bb:cc:00:00:03')
      expect(rates).toBeDefined()
      expect(rates!.avgDownload).toBeCloseTo(8000)
      expect(rates!.avgUpload).toBeCloseTo(4000)
    })

    it('client with no snapshots is absent from result (falls back gracefully)', () => {
      const result = getRecentAvgRates(['no:snap:shots:here:00:01'], 2)
      expect(result.has('no:snap:shots:here:00:01')).toBe(false)
    })

    it('returns averaged rates for multiple clients in one call', () => {
      const now = Math.floor(Date.now() / 1000)
      insertRaw('aa:bb:cc:00:00:04', 1000, 500, now - 60)
      insertRaw('aa:bb:cc:00:00:04', 3000, 1500, now)
      insertRaw('aa:bb:cc:00:00:05', 10000, 5000, now)

      const result = getRecentAvgRates(['aa:bb:cc:00:00:04', 'aa:bb:cc:00:00:05'], 2)
      expect(result.size).toBe(2)
      expect(result.get('aa:bb:cc:00:00:04')!.avgDownload).toBeCloseTo(2000)
      expect(result.get('aa:bb:cc:00:00:05')!.avgDownload).toBeCloseTo(10000)
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
