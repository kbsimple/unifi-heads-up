// tests/lib/db/cache.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getDb, upsertLatestClients, getLatestClients } from '@/lib/db'
import type { NetworkClient } from '@/lib/unifi/types'

// Use in-memory database for tests
process.env.SQLITE_PATH = ':memory:'

const mockClient: NetworkClient = {
  id: 'client-1',
  mac: 'aa:bb:cc:dd:ee:ff',
  displayName: 'iPhone',
  ip: '192.168.1.100',
  lastSeen: new Date('2024-01-15T12:00:00Z'),
  isWired: false,
  isGuest: false,
  downloadRate: 125000,
  uploadRate: 125000,
  signal: -45,
  trafficStatus: 'medium',
}

const mockClient2: NetworkClient = {
  id: 'client-2',
  mac: '11:22:33:44:55:66',
  displayName: 'MacBook',
  ip: '192.168.1.101',
  lastSeen: new Date('2024-01-15T12:05:00Z'),
  isWired: true,
  isGuest: false,
  downloadRate: 250000,
  uploadRate: 50000,
  signal: null,
  trafficStatus: 'high',
}

describe('latest_clients cache', () => {
  beforeEach(() => {
    // Get a fresh in-memory database for each test
    const db = getDb()
    // Clear the table
    db.exec('DELETE FROM latest_clients')
  })

  afterEach(() => {
    // Clean up
    const db = getDb()
    db.exec('DELETE FROM latest_clients')
  })

  describe('upsertLatestClients', () => {
    it('should insert clients into empty table', () => {
      upsertLatestClients([mockClient])

      const result = getLatestClients(Infinity)
      expect(result).not.toBeNull()
      expect(result!.clients).toHaveLength(1)
      expect(result!.clients[0].id).toBe('client-1')
      expect(result!.clients[0].displayName).toBe('iPhone')
      expect(result!.timestamp).toBeGreaterThan(0)
    })

    it('should replace all clients on subsequent call', () => {
      // First insert
      upsertLatestClients([mockClient])
      let result = getLatestClients(Infinity)
      expect(result!.clients).toHaveLength(1)
      expect(result!.clients[0].id).toBe('client-1')

      // Second insert (different clients)
      upsertLatestClients([mockClient2])
      result = getLatestClients(Infinity)
      expect(result!.clients).toHaveLength(1)
      expect(result!.clients[0].id).toBe('client-2')
    })

    it('should insert multiple clients at once', () => {
      upsertLatestClients([mockClient, mockClient2])

      const result = getLatestClients(Infinity)
      expect(result!.clients).toHaveLength(2)
      expect(result!.clients.map((c) => c.id).sort()).toEqual(['client-1', 'client-2'])
    })

    it('should handle clients with null fields', () => {
      const clientWithNulls: NetworkClient = {
        id: 'client-3',
        mac: 'ff:ee:dd:cc:bb:aa',
        displayName: 'Unknown Device',
        ip: null,
        lastSeen: null,
        isWired: false,
        isGuest: true,
        downloadRate: 0,
        uploadRate: 0,
        signal: null,
        trafficStatus: 'idle',
      }

      upsertLatestClients([clientWithNulls])

      const result = getLatestClients(Infinity)
      expect(result!.clients).toHaveLength(1)
      expect(result!.clients[0].ip).toBeNull()
      expect(result!.clients[0].signal).toBeNull()
    })
  })

  describe('getLatestClients', () => {
    it('should return null for empty table', () => {
      const result = getLatestClients(Infinity)
      expect(result).toBeNull()
    })

    it('should return clients with timestamp', () => {
      const beforeInsert = Date.now()
      upsertLatestClients([mockClient])
      const afterInsert = Date.now()

      const result = getLatestClients(Infinity)
      expect(result).not.toBeNull()
      expect(result!.timestamp).toBeGreaterThanOrEqual(beforeInsert)
      expect(result!.timestamp).toBeLessThanOrEqual(afterInsert)
    })

    it('should return null when cache age exceeds maxAge', () => {
      // Insert clients
      upsertLatestClients([mockClient])

      // Manually set the updated_at to be older than maxAge
      const db = getDb()
      const oldTimestamp = Date.now() - 10 * 60 * 1000 // 10 minutes ago
      db.prepare('UPDATE latest_clients SET updated_at = ?').run(oldTimestamp)

      // Default maxAge is 5 minutes, so this should return null
      const result = getLatestClients(5 * 60 * 1000)
      expect(result).toBeNull()
    })

    it('should return clients when cache age is within maxAge', () => {
      upsertLatestClients([mockClient])

      // Cache is fresh (just inserted)
      const result = getLatestClients(60_000) // 1 minute
      expect(result).not.toBeNull()
      expect(result!.clients).toHaveLength(1)
    })

    it('should accept custom maxAge parameter', () => {
      upsertLatestClients([mockClient])

      // Manually age the cache
      const db = getDb()
      const oldTimestamp = Date.now() - 30 * 1000 // 30 seconds ago
      db.prepare('UPDATE latest_clients SET updated_at = ?').run(oldTimestamp)

      // 30 seconds < 60 seconds maxAge, should return data
      const result = getLatestClients(60_000)
      expect(result).not.toBeNull()

      // 30 seconds > 15 seconds maxAge, should return null
      const result2 = getLatestClients(15_000)
      expect(result2).toBeNull()
    })

    it('should correctly deserialize all NetworkClient fields', () => {
      upsertLatestClients([mockClient])

      const result = getLatestClients(Infinity)
      const client = result!.clients[0]

      expect(client.id).toBe('client-1')
      expect(client.mac).toBe('aa:bb:cc:dd:ee:ff')
      expect(client.displayName).toBe('iPhone')
      expect(client.ip).toBe('192.168.1.100')
      expect(client.lastSeen).toBeInstanceOf(Date)
      expect(client.isWired).toBe(false)
      expect(client.isGuest).toBe(false)
      expect(client.downloadRate).toBe(125000)
      expect(client.uploadRate).toBe(125000)
      expect(client.signal).toBe(-45)
      expect(client.trafficStatus).toBe('medium')
    })
  })
})