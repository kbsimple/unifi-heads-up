import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientList } from '@/components/dashboard/client-list'
import { useTrafficHistory } from '@/contexts/traffic-history-context'
import type { ClientsResponse } from '@/lib/unifi/types'

vi.mock('swr', () => ({
  default: vi.fn((_key: string, _fetcher: unknown, config: { fallbackData?: unknown }) => ({
    data: config?.fallbackData,
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  })),
}))

vi.mock('@/contexts/traffic-history-context', () => ({
  TrafficHistoryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTrafficHistory: vi.fn(),
}))

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  }
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

const mockInitial: ClientsResponse = {
  clients: [
    {
      id: 'c-1', mac: 'AA:BB:CC:DD:EE:01', displayName: 'Device 1', ip: '192.168.1.10',
      lastSeen: new Date('2026-04-18T00:00:00Z'), isWired: true, isGuest: false,
      downloadRate: 100_000, uploadRate: 10_000, trafficStatus: 'low',
    },
  ],
  timestamp: Date.now(),
}

describe('ClientList site traffic section (UAT-04-05)', () => {
  beforeEach(() => vi.mocked(useTrafficHistory).mockReset())

  it('does NOT render Site Traffic (24h) when history is unavailable', () => {
    vi.mocked(useTrafficHistory).mockReturnValue({
      siteHistory: [],
      getClientHistory: () => [],
      isHistoryAvailable: false,
    })

    render(<ClientList initialData={mockInitial} />)
    expect(screen.queryByText(/Site Traffic \(24h\)/i)).not.toBeInTheDocument()
  })

  it('renders Site Traffic (24h) section with TrafficChart when history IS available', () => {
    const now = Date.now()
    vi.mocked(useTrafficHistory).mockReturnValue({
      siteHistory: [
        { hourStart: now - 3_600_000, avgDownload: 800_000, avgUpload: 150_000, sampleCount: 60 },
        { hourStart: now, avgDownload: 900_000, avgUpload: 200_000, sampleCount: 60 },
      ],
      getClientHistory: () => [],
      isHistoryAvailable: true,
    })

    render(<ClientList initialData={mockInitial} />)
    expect(screen.getByText(/Site Traffic \(24h\)/i)).toBeInTheDocument()
    // TrafficChart renders via mocked ResponsiveContainer
    expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThanOrEqual(1)
  })
})
