// tests/lib/insights/queries.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { queryAllLastBusy } from '@/lib/insights/queries'

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
