// tests/lib/insights/queries.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { queryAllLastBusy, queryDeviceHistoryRecent, querySiteHistoryRecent } from '@/lib/insights/queries'

function makeDb(): Database.Database {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_mac TEXT NOT NULL,
      download_bps INTEGER NOT NULL,
      upload_bps INTEGER NOT NULL,
      recorded_at INTEGER NOT NULL
    )
  `)
  return db
}

function insert(db: Database.Database, mac: string, downloadBps: number, uploadBps: number, recordedAtSec: number) {
  db.prepare(
    'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
  ).run(mac, downloadBps, uploadBps, recordedAtSec)
}

// Medium threshold: download_bps + upload_bps >= 125000 (1 Mbps)
const ABOVE = { dl: 100_000, ul: 50_000 }  // 150000 >= 125000
const BELOW = { dl: 50_000,  ul: 60_000 }  // 110000 < 125000

const MAC_A = 'aa:bb:cc:dd:ee:01'
const MAC_B = 'aa:bb:cc:dd:ee:02'
const MAC_C = 'aa:bb:cc:dd:ee:03'

describe('queryAllLastBusy (regression: Last Busy column)', () => {
  let db: Database.Database

  beforeEach(() => {
    db = makeDb()
  })

  it('returns unix ms for a device whose combined bps meets the 1 Mbps threshold', () => {
    insert(db, MAC_A, ABOVE.dl, ABOVE.ul, 1000)

    const result = queryAllLastBusy(db)

    expect(result[MAC_A]).toBe(1000 * 1000) // recorded_at seconds → ms
  })

  it('omits devices whose combined bps is below the 125000 bytes/sec threshold', () => {
    insert(db, MAC_B, BELOW.dl, BELOW.ul, 2000)

    const result = queryAllLastBusy(db)

    expect(result[MAC_B]).toBeUndefined()
  })

  it('returns the MAX recorded_at when a device has multiple qualifying snapshots', () => {
    insert(db, MAC_C, ABOVE.dl, ABOVE.ul, 500)
    insert(db, MAC_C, ABOVE.dl, ABOVE.ul, 800) // newer

    const result = queryAllLastBusy(db)

    expect(result[MAC_C]).toBe(800 * 1000)
  })

  it('only considers snapshots that cross the threshold when choosing MAX', () => {
    // MAC_A: one qualifying snapshot at t=600, one non-qualifying at t=900
    insert(db, MAC_A, ABOVE.dl, ABOVE.ul, 600)
    insert(db, MAC_A, BELOW.dl, BELOW.ul, 900) // more recent but below threshold

    const result = queryAllLastBusy(db)

    expect(result[MAC_A]).toBe(600 * 1000) // non-qualifying snapshot must not win
  })

  it('handles multiple devices correctly in one query', () => {
    insert(db, MAC_A, ABOVE.dl, ABOVE.ul, 1000)
    insert(db, MAC_B, BELOW.dl, BELOW.ul, 2000)
    insert(db, MAC_C, ABOVE.dl, ABOVE.ul, 500)
    insert(db, MAC_C, ABOVE.dl, ABOVE.ul, 800)

    const result = queryAllLastBusy(db)

    expect(result[MAC_A]).toBe(1000 * 1000)
    expect(result[MAC_B]).toBeUndefined()
    expect(result[MAC_C]).toBe(800 * 1000)
    expect(Object.keys(result)).toHaveLength(2)
  })

  it('returns an empty object when the snapshots table is empty', () => {
    const result = queryAllLastBusy(db)
    expect(result).toEqual({})
  })
})

describe('queryDeviceHistoryRecent (regression: time-range selector)', () => {
  let db: Database.Database
  let nowSec: number

  beforeEach(() => {
    db = makeDb()
    nowSec = Math.floor(Date.now() / 1000)
  })

  it('returns buckets covering the full window even when no data exists', () => {
    const result = queryDeviceHistoryRecent(db, MAC_A, 5)
    // 5 minutes / 60-second buckets = 5 or 6 buckets
    expect(result.length).toBeGreaterThanOrEqual(5)
    expect(result.every((b) => typeof b.bucketTs === 'number')).toBe(true)
    // Past completed buckets have no measurements → 0 (genuine idle)
    const pastBuckets = result.slice(0, -1)
    expect(pastBuckets.every((b) => b.avgMbps === 0)).toBe(true)
    // Current (last) bucket may not have been polled yet → null
    expect(result[result.length - 1].avgMbps).toBeNull()
  })

  it('fills past gaps with 0; current bucket is null only when it has no data', () => {
    // Insert at two separated points within a 5-minute window.
    // nowSec - 240 is in an older bucket; nowSec - 10 is in the current bucket.
    insert(db, MAC_A, 1_000_000, 500_000, nowSec - 240)
    insert(db, MAC_A, 1_000_000, 500_000, nowSec - 10)

    const result = queryDeviceHistoryRecent(db, MAC_A, 5)
    // Buckets with recorded data should be > 0
    const dataBuckets = result.filter((b) => b.avgMbps !== null && b.avgMbps > 0)
    expect(dataBuckets.length).toBeGreaterThan(0)
    // Past buckets with no data should be 0 (not null)
    const pastZeroBuckets = result.slice(0, -1).filter((b) => b.avgMbps === 0)
    expect(pastZeroBuckets.length).toBeGreaterThan(0)
    // At least one bucket has observed data (confirmed above via dataBuckets)
  })

  it('converts bps to Mbps correctly', () => {
    // 1_000_000 dl + 500_000 ul = 1_500_000 bytes/sec * 8 / 1_000_000 = 12.0 Mbps
    insert(db, MAC_A, 1_000_000, 500_000, nowSec - 10)

    const result = queryDeviceHistoryRecent(db, MAC_A, 5)
    const bucket = result.find((b) => b.avgMbps !== null && b.avgMbps > 0)
    expect(bucket).toBeDefined()
    expect(bucket!.avgMbps).toBeCloseTo(12.0, 1)
  })

  it('ignores snapshots outside the window', () => {
    // Insert data well outside the 5-minute window
    insert(db, MAC_A, 1_000_000, 500_000, nowSec - 3600)

    const result = queryDeviceHistoryRecent(db, MAC_A, 5)
    // Past buckets: 0 (no in-window data); current bucket: null
    const pastBuckets = result.slice(0, -1)
    expect(pastBuckets.every((b) => b.avgMbps === 0)).toBe(true)
    expect(result[result.length - 1].avgMbps).toBeNull()
  })

  it('returns only data for the specified MAC', () => {
    insert(db, MAC_A, 1_000_000, 500_000, nowSec - 10)
    insert(db, MAC_B, 2_000_000, 1_000_000, nowSec - 10)

    const resultA = queryDeviceHistoryRecent(db, MAC_A, 5)
    const resultB = queryDeviceHistoryRecent(db, MAC_B, 5)

    const mbpsA = resultA.find((b) => b.avgMbps !== null && b.avgMbps > 0)?.avgMbps ?? 0
    const mbpsB = resultB.find((b) => b.avgMbps !== null && b.avgMbps > 0)?.avgMbps ?? 0
    expect(mbpsA).toBeCloseTo(12.0, 0)
    expect(mbpsB).toBeCloseTo(24.0, 0)
  })
})

describe('querySiteHistoryRecent (regression: site chart time-range selector)', () => {
  let db: Database.Database
  let nowSec: number

  beforeEach(() => {
    db = makeDb()
    nowSec = Math.floor(Date.now() / 1000)
  })

  it('returns 0 for past buckets and null for current bucket when table is empty', () => {
    const result = querySiteHistoryRecent(db, 5)
    expect(result.length).toBeGreaterThanOrEqual(5)
    const pastBuckets = result.slice(0, -1)
    expect(pastBuckets.every((b) => b.avgMbps === 0)).toBe(true)
    expect(result[result.length - 1].avgMbps).toBeNull()
  })

  it('sums bandwidth across all MACs in the same bucket', () => {
    // Two devices in the same ~10-second window → same 60s bucket
    insert(db, MAC_A, 1_000_000, 0, nowSec - 5)
    insert(db, MAC_B, 1_000_000, 0, nowSec - 5)

    const result = querySiteHistoryRecent(db, 5)
    const bucket = result.find((b) => b.avgMbps !== null && b.avgMbps > 0)
    expect(bucket).toBeDefined()
    // 2 devices × 1_000_000 bytes/sec × 8 / 1_000_000 = 16 Mbps
    expect(bucket!.avgMbps).toBeCloseTo(16.0, 0)
  })

  it('excludes data outside the requested window', () => {
    insert(db, MAC_A, 5_000_000, 0, nowSec - 7200)  // 2 hours ago, outside 5m window

    const result = querySiteHistoryRecent(db, 5)
    const pastBuckets = result.slice(0, -1)
    expect(pastBuckets.every((b) => b.avgMbps === 0)).toBe(true)
    expect(result[result.length - 1].avgMbps).toBeNull()
  })
})
