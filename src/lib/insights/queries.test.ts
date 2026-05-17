import Database from 'better-sqlite3'
import { describe, it, expect, beforeEach } from 'vitest'
import { queryTopDevices, queryDeviceActivity } from './queries'

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
    const result = queryTopDevices(db, 7)
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

    const result = queryTopDevices(db, 7)
    expect(result).toHaveLength(3)
    expect(result[0].mac).toBe('aa:bb:cc:dd:ee:02')
    expect(result[0].totalBytes).toBe(1000)
    expect(result[1].mac).toBe('aa:bb:cc:dd:ee:01')
    expect(result[1].totalBytes).toBe(300)
    expect(result[2].mac).toBe('aa:bb:cc:dd:ee:03')
    expect(result[2].totalBytes).toBe(100)
  })

  it('excludes snapshots outside the days window', () => {
    const insert = db.prepare(
      'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
    )
    // Within 7 days
    insert.run('aa:bb:cc:dd:ee:01', 100, 200, NOW - 3 * DAY)
    // Outside 7 days (8 days ago)
    insert.run('aa:bb:cc:dd:ee:02', 500, 500, NOW - 8 * DAY)

    const result = queryTopDevices(db, 7)
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

    const result = queryTopDevices(db, 7)
    expect(result).toHaveLength(20)
  })

  it('sums multiple snapshots per device', () => {
    const insert = db.prepare(
      'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
    )
    insert.run('aa:bb:cc:dd:ee:01', 100, 200, NOW - DAY)
    insert.run('aa:bb:cc:dd:ee:01', 300, 400, NOW - 2 * DAY)

    const result = queryTopDevices(db, 7)
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
    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 7)
    expect(result).toHaveLength(24)
  })

  it('returns 24 buckets with hour 0-23 even with no data', () => {
    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 7)
    expect(result.map(b => b.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i))
  })

  it('fills missing hours with avgMbps=0 and active=false', () => {
    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 7)
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

    // 3_000_000 download + 2_000_000 upload = 5 Mbps average
    insert.run('aa:bb:cc:dd:ee:01', 3_000_000, 2_000_000, ts)

    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 7)
    expect(result).toHaveLength(24)

    const hour10 = result.find(b => b.hour === 10)
    expect(hour10).toBeDefined()
    expect(hour10!.avgMbps).toBeCloseTo(5.0, 1)
    expect(hour10!.active).toBe(true)
  })

  it('marks active=true when avgMbps >= 0.5', () => {
    const insert = db.prepare(
      'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
    )
    const date = new Date()
    date.setUTCHours(8, 0, 0, 0)
    const ts = Math.floor(date.getTime() / 1000) - DAY
    // Exactly 0.5 Mbps
    insert.run('aa:bb:cc:dd:ee:01', 250_000, 250_000, ts)

    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 7)
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
    // 0.4 Mbps total (200_000 down + 200_000 up = 400_000 bps = 0.4 Mbps)
    insert.run('aa:bb:cc:dd:ee:01', 200_000, 200_000, ts)

    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 7)
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

    const result = queryDeviceActivity(db, 'aa:bb:cc:dd:ee:01', 7)
    const hour12 = result.find(b => b.hour === 12)
    expect(hour12!.avgMbps).toBe(0)
    expect(hour12!.active).toBe(false)
  })
})
