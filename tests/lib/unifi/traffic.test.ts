// tests/lib/unifi/traffic.test.ts
import { describe, it, expect } from 'vitest'
import { calculateTrafficStatus, bytesPerSecToMbps } from '@/lib/unifi/traffic'

describe('bytesPerSecToMbps', () => {
  it('should convert bytes per second to Mbps', () => {
    // 125000 bytes/sec = 1 Mbps (125000 * 8 / 1,000,000)
    expect(bytesPerSecToMbps(125000)).toBe(1)
  })

  it('should handle zero bytes', () => {
    expect(bytesPerSecToMbps(0)).toBe(0)
  })

  it('should handle large values', () => {
    // 12,500,000 bytes/sec = 100 Mbps
    expect(bytesPerSecToMbps(12500000)).toBe(100)
  })
})

describe('calculateTrafficStatus', () => {
  it('should return idle for less than 1 Mbps', () => {
    // 0 bytes/sec both directions = 0 Mbps total
    expect(calculateTrafficStatus(0, 0)).toBe('idle')
  })

  it('should return low for 1-10 Mbps', () => {
    // 125000 bytes/sec = 1 Mbps, so 125000 * 2 = 2 Mbps total
    expect(calculateTrafficStatus(125000, 125000)).toBe('low')
  })

  it('should return medium for 10-100 Mbps', () => {
    // 3,125,000 bytes/sec = 25 Mbps each, so 50 Mbps total (medium range)
    expect(calculateTrafficStatus(3125000, 3125000)).toBe('medium')
  })

  it('should return high for over 100 Mbps', () => {
    // 12,500,000 bytes/sec = 100 Mbps each, so 200 Mbps total
    expect(calculateTrafficStatus(12500000, 12500000)).toBe('high')
  })

  it('should combine download and upload rates', () => {
    // 625000 bytes/sec download (5 Mbps) + 1875000 upload (15 Mbps) = 20 Mbps total
    expect(calculateTrafficStatus(625000, 1875000)).toBe('medium')
  })

  it('should handle asymmetric traffic', () => {
    // Only download traffic
    // 6250000 bytes/sec = 50 Mbps
    expect(calculateTrafficStatus(6250000, 0)).toBe('medium')
  })
})