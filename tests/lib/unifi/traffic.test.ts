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
  it('should return idle for less than 0.5 Mbps', () => {
    // 0 bytes/sec both directions = 0 Mbps total
    expect(calculateTrafficStatus(0, 0)).toBe('idle')
  })

  it('should return idle for 0.25 Mbps (below 0.5 threshold)', () => {
    // 31250 bytes/sec = 0.25 Mbps — below idle threshold
    expect(calculateTrafficStatus(31250, 0)).toBe('idle')
  })

  it('should return low for 0.5 Mbps (at idle/low boundary)', () => {
    // 62500 bytes/sec = 0.5 Mbps — exactly at boundary, should be low
    expect(calculateTrafficStatus(62500, 0)).toBe('low')
  })

  it('should return low for 0.5–1 Mbps', () => {
    // 93750 bytes/sec = 0.75 Mbps — in the low range (0.5–1 Mbps)
    expect(calculateTrafficStatus(93750, 0)).toBe('low')
  })

  it('should return medium for 1–5 Mbps', () => {
    // 187500 bytes/sec = 1.5 Mbps each, so 3 Mbps total — medium range
    expect(calculateTrafficStatus(187500, 187500)).toBe('medium')
  })

  it('should return medium for 2.5 Mbps (just under 5 Mbps high threshold)', () => {
    // 312500 bytes/sec = 2.5 Mbps — still medium
    expect(calculateTrafficStatus(312500, 0)).toBe('medium')
  })

  it('should return high for 5 Mbps and above (at boundary)', () => {
    // 625000 bytes/sec = 5 Mbps — exactly at high threshold
    expect(calculateTrafficStatus(625000, 0)).toBe('high')
  })

  it('should return high for over 5 Mbps', () => {
    // 12,500,000 bytes/sec = 100 Mbps each, so 200 Mbps total
    expect(calculateTrafficStatus(12500000, 12500000)).toBe('high')
  })

  it('should combine download and upload rates', () => {
    // 62500 bytes/sec each = 0.5 Mbps each = 1 Mbps total — medium
    expect(calculateTrafficStatus(62500, 62500)).toBe('medium')
  })

  it('should handle asymmetric traffic', () => {
    // Only download traffic: 250000 bytes/sec = 2 Mbps — medium
    expect(calculateTrafficStatus(250000, 0)).toBe('medium')
  })
})
