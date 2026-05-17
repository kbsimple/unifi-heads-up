// tests/lib/unifi/format.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatTimeAgo } from '@/lib/unifi/format'

describe('formatTimeAgo', () => {
  const NOW = new Date('2024-06-15T12:00:00.000Z').getTime()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns em-dash for null', () => {
    expect(formatTimeAgo(null)).toBe('—')
  })

  it('returns "just now" for 0 seconds ago', () => {
    expect(formatTimeAgo(NOW)).toBe('just now')
  })

  it('returns "just now" for 59 seconds ago', () => {
    expect(formatTimeAgo(NOW - 59_000)).toBe('just now')
  })

  it('returns "1m ago" for exactly 1 minute ago', () => {
    expect(formatTimeAgo(NOW - 60_000)).toBe('1m ago')
  })

  it('returns "30m ago" for 30 minutes ago', () => {
    expect(formatTimeAgo(NOW - 30 * 60_000)).toBe('30m ago')
  })

  it('returns "59m ago" for 59 minutes ago', () => {
    expect(formatTimeAgo(NOW - 59 * 60_000)).toBe('59m ago')
  })

  it('returns "1h ago" for exactly 1 hour ago', () => {
    expect(formatTimeAgo(NOW - 3_600_000)).toBe('1h ago')
  })

  it('returns "5h ago" for 5 hours ago', () => {
    expect(formatTimeAgo(NOW - 5 * 3_600_000)).toBe('5h ago')
  })

  it('returns "23h ago" for 23 hours ago', () => {
    expect(formatTimeAgo(NOW - 23 * 3_600_000)).toBe('23h ago')
  })

  it('returns "1d ago" for exactly 1 day ago', () => {
    expect(formatTimeAgo(NOW - 86_400_000)).toBe('1d ago')
  })

  it('returns "7d ago" for 7 days ago', () => {
    expect(formatTimeAgo(NOW - 7 * 86_400_000)).toBe('7d ago')
  })

  it('accepts a Date object', () => {
    const date = new Date(NOW - 2 * 3_600_000)
    expect(formatTimeAgo(date)).toBe('2h ago')
  })

  it('accepts a numeric timestamp', () => {
    expect(formatTimeAgo(NOW - 45 * 60_000)).toBe('45m ago')
  })
})
