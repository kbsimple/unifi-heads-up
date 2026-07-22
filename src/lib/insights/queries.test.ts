import Database from 'better-sqlite3'
import { describe, it, expect, beforeEach } from 'vitest'
import { queryTopDevices, queryDeviceActivity, queryDeviceHistoryRecent, querySiteHistoryRecent } from './queries'

function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_mac TEXT NOT NULL,
      download_bps INTEGER NOT NULL,
      upload_bps INTEGER NOT NULL,
      recorded_at INTEGER NOT NULL
    );
  `)
  return db
}

const NOW = Math.floor(Date.now() / 1000)
const DAY = 86400

describe('queryTopDevices', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
  })

  it('returns empty array when no snapshots exist', () => {
    const result = queryTopDevices(db, 10080)
    expect(result).toEqual([])
  })

  it('returns devices ranked by totalBytes descending', () => {
    const insert = db.prepare(
      'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
    )
    // Device A: 100 + 200 = 300 total
    insert.run('aa:bb:cc:dd:ee:01', 100, 200, NOW - DAY)
    // Device B: 500 + 500 = 1000 total
    insert.run('aa:bb:cc:dd:ee:02', 500, 500, NOW - DAY)
    // Device C: 50 + 50 = 100 total
    insert.run('aa:bb:cc:dd:ee:03', 50, 50, NOW - DAY)

    const result = queryTopDevices(db, 10080)
    expect(result).toHaveLength(3)
    expect(result[0].mac).toBe('aa:bb:cc:dd:ee:02')
    expect(result[0].totalBytes).toBe(1000)
    expect(result[1].mac).toBe('aa:bb:cc:dd:ee:01')
    expect(result[1].totalBytes).toBe(300)
    expect(result[2].mac).toBe('aa:bb:cc:dd:ee:03')
    expect(result[2].totalBytes).toBe(100)
  })

  it('excludes snapshots outside the minutes window', () => {
    const insert = db.prepare(
      'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
    )
    // Within 7 days (10080 min)
    insert.run('aa:bb:cc:dd:ee:01', 100, 200, NOW - 3 * DAY)
    // Outside 7 days (8 days ago)
    insert.run('aa:bb:cc:dd:ee:02', 500, 500, NOW - 8 * DAY)

    const result = queryTopDevices(db, 10080)
    expect(result).toHaveLength(1)
    expect(result[0].mac).toBe('aa:bb:cc:dd:ee:01')
  })

  it('limits to 20 devices', () => {
    const insert = db.prepare(
      'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
    )
    for (let i = 0; i < 25; i++) {
      const mac = `aa:bb:cc:dd:ee:${i.toString().padStart(2, '0')}`
      insert.run(mac, 100 + i, 100 + i, NOW - DAY)
    }

    const result = queryTopDevices(db, 10080)
    expect(result).toHaveLength(20)
  })

  it('sums multiple snapshots per device', () => {
    const insert = db.prepare(
      'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
    )
    insert.run('aa:bb:cc:dd:ee:01', 100, 200, NOW - DAY)
    insert.run('aa:bb:cc:dd:ee:01', 300, 400, NOW - 2 * DAY)

    const result = queryTopDevices(db, 10080)
    expect(result).toHaveLength(1)
    expect(result[0].totalBytes).toBe(1000) // (100+200) + (300+400)
  })
})

describe('queryDeviceActivity', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
  })

  it('always returns exactly 24 buckets', () => {
    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 10080)
    expect(result).toHaveLength(24)
  })

  it('returns 24 buckets with hour 0-23 even with no data', () => {
    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 10080)
    expect(result.map(b => b.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i))
  })

  it('fills missing hours with avgMbps=0 and active=false', () => {
    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 10080)
    for (const bucket of result) {
      expect(bucket.avgMbps).toBe(0)
      expect(bucket.active).toBe(false)
    }
  })

  it('calculates avgMbps correctly from download_bps and upload_bps', () => {
    const insert = db.prepare(
      'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
    )
    // Insert a snapshot with known bps values at a specific hour
    // Use a fixed timestamp: find a recent timestamp that falls at hour 10
    const date = new Date()
    date.setUTCHours(10, 0, 0, 0)
    // Push it back to yesterday to ensure it's within days window
    const ts = Math.floor(date.getTime() / 1000) - DAY

    // download_bps/upload_bps store bytes/sec — Mbps = bytes/sec * 8 / 1_000_000
    // 3_000_000 + 2_000_000 = 5_000_000 bytes/sec → 40 Mbps average
    insert.run('aa:bb:cc:dd:ee:01', 3_000_000, 2_000_000, ts)

    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 10080)
    expect(result).toHaveLength(24)

    const hour10 = result.find(b => b.hour === 10)
    expect(hour10).toBeDefined()
    expect(hour10!.avgMbps).toBeCloseTo(40.0, 1)
    expect(hour10!.active).toBe(true)
  })

  it('marks active=true when avgMbps >= 0.5', () => {
    const insert = db.prepare(
      'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
    )
    const date = new Date()
    date.setUTCHours(8, 0, 0, 0)
    const ts = Math.floor(date.getTime() / 1000) - DAY
    // Exactly 0.5 Mbps: 62_500 bytes/sec total * 8 / 1_000_000 = 0.5
    insert.run('aa:bb:cc:dd:ee:01', 31_250, 31_250, ts)

    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 10080)
    const hour8 = result.find(b => b.hour === 8)
    expect(hour8!.active).toBe(true)
  })

  it('marks active=false when avgMbps < 0.5', () => {
    const insert = db.prepare(
      'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
    )
    const date = new Date()
    date.setUTCHours(3, 0, 0, 0)
    const ts = Math.floor(date.getTime() / 1000) - DAY
    // 0.4 Mbps total: 25_000 down + 25_000 up = 50_000 bytes/sec * 8 / 1_000_000 = 0.4 Mbps
    insert.run('aa:bb:cc:dd:ee:01', 25_000, 25_000, ts)

    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 10080)
    const hour3 = result.find(b => b.hour === 3)
    expect(hour3!.active).toBe(false)
    expect(hour3!.avgMbps).toBeCloseTo(0.4, 1)
  })

  it('excludes snapshots outside the days window', () => {
    const insert = db.prepare(
      'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
    )
    const date = new Date()
    date.setUTCHours(12, 0, 0, 0)
    const oldTs = Math.floor(date.getTime() / 1000) - 8 * DAY // 8 days ago, outside 7d window

    insert.run('aa:bb:cc:dd:ee:01', 10_000_000, 10_000_000, oldTs)

    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 10080)
    const hour12 = result.find(b => b.hour === 12)
    expect(hour12!.avgMbps).toBe(0)
    expect(hour12!.active).toBe(false)
  })
})

describe('queryDeviceHistoryRecent', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
  })

  it('returns null avgMbps for buckets with no measurements', () => {
    // No snapshots inserted — all buckets should be null
    const result = queryDeviceHistoryRecent(db, 'aa:bb:cc:dd:ee:01', 30)
    expect(result.length).toBeGreaterThan(0)
    for (const bucket of result) {
      expect(bucket.avgMbps).toBeNull()
    }
  })

  it('returns non-null avgMbps only for buckets with actual measurements', () => {
    const insert = db.prepare(
      'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
    )
    // Insert a snapshot at a known recent time (within 30 min window)
    const recentTs = NOW - 60 // 1 minute ago, well within 30-min window
    insert.run('aa:bb:cc:dd:ee:01', 1_000_000, 500_000, recentTs)

    const result = queryDeviceHistoryRecent(db, 'aa:bb:cc:dd:ee:01', 30)

    // At least one bucket must be non-null (the one containing the snapshot)
    const nonNullBuckets = result.filter(b => b.avgMbps !== null)
    expect(nonNullBuckets.length).toBeGreaterThan(0)

    // All other buckets must be null (no measurements)
    const nullBuckets = result.filter(b => b.avgMbps === null)
    expect(nullBuckets.length).toBeGreaterThan(0)

    // The non-null bucket should have the correct Mbps value
    // 1_000_000 down + 500_000 up = 1_500_000 bytes/sec * 8 / 1_000_000 = 12 Mbps
    for (const bucket of nonNullBuckets) {
      expect(bucket.avgMbps).toBeCloseTo(12.0, 0)
    }
  })
})

describe('querySiteHistoryRecent', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
  })

  it('returns null avgMbps for buckets with no measurements', () => {
    // No snapshots — all buckets should be null
    const result = querySiteHistoryRecent(db, 30)
    expect(result.length).toBeGreaterThan(0)
    for (const bucket of result) {
      expect(bucket.avgMbps).toBeNull()
    }
  })
})
