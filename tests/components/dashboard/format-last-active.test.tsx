// tests/components/dashboard/format-last-active.test.ts
// TDD: Tests for ISO string coercion in formatLastActive.
// These cover the SWR rehydration path where Date objects become ISO strings.
// The existing components call date.getTime() directly without coercion, so
// tests using ISO strings as lastSeen will fail RED until the fix is applied.

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientTable } from '@/components/dashboard/client-table'
import { ClientCard } from '@/components/dashboard/client-card'
import { TrafficHistoryProvider } from '@/contexts/traffic-history-context'
import type { NetworkClient } from '@/lib/unifi/types'

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: undefined,
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  })),
}))

// A client whose lastSeen is an ISO string — simulates SWR rehydration where
// JSON.parse deserializes Date fields to strings.
const clientWithIsoLastSeen = {
  id: 'client-iso',
  mac: 'AA:BB:CC:DD:EE:01',
  displayName: 'ISO Device',
  ip: '192.168.1.200',
  // Cast: runtime value is a string but type says Date | null
  lastSeen: '2020-01-01T00:00:00.000Z' as unknown as Date,
  isWired: true,
  isGuest: false,
  downloadRate: 0,
  uploadRate: 0,
  trafficStatus: 'idle',
} satisfies NetworkClient

describe('formatLastActive — ISO string coercion (SWR rehydration path)', () => {
  it('ClientTable renders without throwing when lastSeen is an ISO string', () => {
    expect(() =>
      render(<ClientTable clients={[clientWithIsoLastSeen]} />)
    ).not.toThrow()
  })

  it('ClientTable shows a relative date string (not crash) for ISO lastSeen', () => {
    render(<ClientTable clients={[clientWithIsoLastSeen]} />)
    // Should display something like "2234d ago" — any relative string is acceptable
    const lastActiveCells = screen.getAllByText(/ago|just now|Unknown/)
    expect(lastActiveCells.length).toBeGreaterThan(0)
  })

  it('ClientCard renders without throwing when lastSeen is an ISO string', () => {
    expect(() =>
      render(
        <TrafficHistoryProvider>
          <ClientCard client={clientWithIsoLastSeen} />
        </TrafficHistoryProvider>
      )
    ).not.toThrow()
  })

  it('ClientCard shows "Last active:" label with a value for ISO lastSeen', () => {
    render(
      <TrafficHistoryProvider>
        <ClientCard client={clientWithIsoLastSeen} />
      </TrafficHistoryProvider>
    )
    expect(screen.getByText(/Last active:/)).toBeInTheDocument()
  })

  it('ClientTable shows "Unknown" for null lastSeen', () => {
    const clientNullLastSeen = { ...clientWithIsoLastSeen, lastSeen: null }
    render(<ClientTable clients={[clientNullLastSeen]} />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })
})
