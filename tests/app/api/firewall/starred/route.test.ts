// tests/app/api/firewall/starred/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock server-only (already handled by setup.ts but explicit for clarity)
vi.mock('server-only', () => ({}))

// Mock session
vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

// Mock the db module — use an in-memory SQLite database
vi.mock('@/lib/db', () => {
  const Database = require('better-sqlite3')
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE IF NOT EXISTS starred_rules (
      rule_id TEXT PRIMARY KEY,
      starred_at INTEGER NOT NULL
    )
  `)
  return {
    getDb: vi.fn(() => db),
  }
})

import { GET, POST } from '@/app/api/firewall/starred/route'
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db'

describe('GET /api/firewall/starred', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear table before each test
    getDb().exec('DELETE FROM starred_rules')
  })

  it('returns 401 when no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('UNAUTHORIZED')
  })

  it('returns { starredIds: [] } when table is empty and session is valid', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'test', expiresAt: new Date(Date.now() + 86400000) })

    const response = await GET()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual({ starredIds: [] })
  })

  it('returns starredIds array after insert', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'test', expiresAt: new Date(Date.now() + 86400000) })
    getDb().prepare('INSERT INTO starred_rules (rule_id, starred_at) VALUES (?, ?)').run('rule-abc', Date.now())

    const response = await GET()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.starredIds).toContain('rule-abc')
  })
})

describe('POST /api/firewall/starred', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear table before each test
    getDb().exec('DELETE FROM starred_rules')
  })

  it('returns 401 when no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const response = await POST(new Request('http://localhost/api/firewall/starred', {
      method: 'POST',
      body: JSON.stringify({ ruleId: 'abc', starred: true }),
    }))

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('UNAUTHORIZED')
  })

  it('returns 400 when ruleId is missing', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'test', expiresAt: new Date(Date.now() + 86400000) })

    const response = await POST(new Request('http://localhost/api/firewall/starred', {
      method: 'POST',
      body: JSON.stringify({ starred: true }),
    }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('VALIDATION_ERROR')
  })

  it('inserts a row and returns { ok: true } when starred: true', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'test', expiresAt: new Date(Date.now() + 86400000) })

    const response = await POST(new Request('http://localhost/api/firewall/starred', {
      method: 'POST',
      body: JSON.stringify({ ruleId: 'abc', starred: true }),
    }))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual({ ok: true })

    const row = getDb().prepare('SELECT * FROM starred_rules WHERE rule_id = ?').get('abc')
    expect(row).toBeTruthy()
  })

  it('deletes a row and returns { ok: true } when starred: false', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'test', expiresAt: new Date(Date.now() + 86400000) })
    getDb().prepare('INSERT INTO starred_rules (rule_id, starred_at) VALUES (?, ?)').run('abc', Date.now())

    const response = await POST(new Request('http://localhost/api/firewall/starred', {
      method: 'POST',
      body: JSON.stringify({ ruleId: 'abc', starred: false }),
    }))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual({ ok: true })

    const row = getDb().prepare('SELECT * FROM starred_rules WHERE rule_id = ?').get('abc')
    expect(row).toBeUndefined()
  })

  it('is idempotent when calling starred: true twice for the same ruleId', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'test', expiresAt: new Date(Date.now() + 86400000) })

    const makeRequest = () => POST(new Request('http://localhost/api/firewall/starred', {
      method: 'POST',
      body: JSON.stringify({ ruleId: 'abc', starred: true }),
    }))

    await makeRequest()
    const response = await makeRequest()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual({ ok: true })

    const rows = getDb().prepare('SELECT * FROM starred_rules WHERE rule_id = ?').all('abc')
    expect(rows).toHaveLength(1)
  })

  it('returns 400 when ruleId is empty string', async () => {
    vi.mocked(getSession).mockResolvedValue({ username: 'test', expiresAt: new Date(Date.now() + 86400000) })

    const response = await POST(new Request('http://localhost/api/firewall/starred', {
      method: 'POST',
      body: JSON.stringify({ ruleId: '', starred: true }),
    }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('VALIDATION_ERROR')
  })
})
