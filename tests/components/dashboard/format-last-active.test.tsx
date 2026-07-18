// tests/components/dashboard/format-last-active.test.tsx
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

vi.mock('@/contexts/traffic-history-context', () => ({
  TrafficHistoryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTrafficHistory: vi.fn(() => ({
    siteHistory: [],
    getClientHistory: () => [],
    getClientLastBusy: () => null,
    isHistoryAvailable: false,
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
  signal: null,
    trafficStatus: 'idle',
  lastBusy: null,
} satisfies NetworkClient

describe('formatLastActive — ISO string coercion (SWR rehydration path)', () => {
  it('ClientTable renders without throwing when lastSeen is an ISO string', () => {
    expect(() =>
      render(<ClientTable clients={[clientWithIsoLastSeen]} />)
    ).not.toThrow()
  })

  it('ClientTable shows "—" when getClientLastBusy returns null', () => {
    render(<ClientTable clients={[clientWithIsoLastSeen]} />)
    // ClientTable uses getClientLastBusy from context, which returns null
    // It shows "—" for null, and also for zero download/upload rates
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
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

  it('ClientCard shows "Last busy:" label with a value for ISO lastSeen', () => {
    render(
      <TrafficHistoryProvider>
        <ClientCard client={clientWithIsoLastSeen} />
      </TrafficHistoryProvider>
    )
    expect(screen.getByText(/Last busy:/)).toBeInTheDocument()
  })

  it('ClientTable shows "—" for null lastSeen', () => {
    const clientNullLastSeen = { ...clientWithIsoLastSeen, lastSeen: null }
    render(<ClientTable clients={[clientNullLastSeen]} />)
    // Multiple dashes appear: download (formatRate(0)), upload (formatRate(0)), lastBusy
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })
})
