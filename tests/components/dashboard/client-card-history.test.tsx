import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClientCard } from '@/components/dashboard/client-card'
import { useTrafficHistory } from '@/contexts/traffic-history-context'
import type { NetworkClient } from '@/lib/unifi/types'

// Short-circuit the context module — no SWR, no provider side effects.
// ClientCard only uses getClientLastBusy from this context now.
vi.mock('@/contexts/traffic-history-context', () => ({
  TrafficHistoryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTrafficHistory: vi.fn(),
}))

vi.mock('@/components/dashboard/inline-firewall-rules', () => ({
  InlineFirewallRules: () => <div data-testid="inline-firewall-rules" />,
}))

// Keep recharts renderable in jsdom — ResponsiveContainer measures parent (0px) and renders nothing
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  }
})

const mockClient: NetworkClient = {
  id: 'client-1',
  mac: 'AA:BB:CC:DD:EE:FF',
  displayName: 'Test Device',
  ip: '192.168.1.100',
  lastSeen: new Date('2026-04-18T00:00:00Z'),
  isWired: true,
  isGuest: false,
  downloadRate: 500_000,
  uploadRate: 50_000,
  signal: null,
  trafficStatus: 'medium',
  lastBusy: null,
}

function stubContext(lastBusy: number | null = null) {
  vi.mocked(useTrafficHistory).mockReturnValue({
    siteHistory: [],
    getClientHistory: () => [],
    getClientLastBusy: () => lastBusy,
    isHistoryAvailable: false,
  })
}

// History bucket shape returned by /api/insights/device-history
interface HistoryBucket {
  bucketTs: number
  avgMbps: number
}

function stubFetch(buckets: HistoryBucket[]) {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(buckets),
  } as unknown as Response)
}

describe('ClientCard history expansion (UAT-04-04)', () => {
  beforeEach(() => {
    vi.mocked(useTrafficHistory).mockReset()
    vi.restoreAllMocks()
    stubContext()
  })

  it('starts with history hidden and button labeled "View History"', () => {
    stubFetch([])
    render(<ClientCard client={mockClient} />)
    const toggle = screen.getByRole('button', { name: /View History/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows loading state immediately after clicking View History', async () => {
    // Never resolves so we can assert the loading state
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
    render(<ClientCard client={mockClient} />)
    fireEvent.click(screen.getByRole('button', { name: /View History/i }))
    // Chart is shown immediately (dimmed via aria-busy) rather than replaced by loading text
    const chart = await screen.findByLabelText(/Traffic chart showing bandwidth over time/i)
    expect(chart.closest('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('renders TrafficChart when DB returns active buckets', async () => {
    const buckets: HistoryBucket[] = [
      { bucketTs: 1718445600, avgMbps: 5.2 },  // some valid unix timestamp
      { bucketTs: 1718449200, avgMbps: 3.1 },
      // zero-traffic hours are not filtered by source, just show 0 bandwidth
    ]
    stubFetch(buckets)

    render(<ClientCard client={mockClient} />)
    fireEvent.click(screen.getByRole('button', { name: /View History/i }))

    // Wait for fetch to resolve
    await waitFor(() => {
      expect(screen.getByLabelText(/Traffic chart showing bandwidth over time/i)).toBeInTheDocument()
    })
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.queryByText(/No traffic history/i)).not.toBeInTheDocument()
  })

  it('toggles button label after opening history', async () => {
    stubFetch([])
    render(<ClientCard client={mockClient} />)
    fireEvent.click(screen.getByRole('button', { name: /View History/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hide History/i })).toHaveAttribute('aria-expanded', 'true')
    })
  })

  it('shows chart with zero data when DB returns all-zero buckets', async () => {
    const buckets: HistoryBucket[] = Array.from({ length: 24 }, (_, i) => ({
      bucketTs: 1718445600 + i * 3600,  // sequential hours
      avgMbps: 0,
    }))
    stubFetch(buckets)

    render(<ClientCard client={mockClient} />)
    fireEvent.click(screen.getByRole('button', { name: /View History/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Traffic chart showing bandwidth over time/i)).toBeInTheDocument()
    })
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.queryByText(/No traffic history/i)).not.toBeInTheDocument()
  })

  it('fetches from the correct API endpoint with the client MAC', async () => {
    stubFetch([])
    render(<ClientCard client={mockClient} />)
    fireEvent.click(screen.getByRole('button', { name: /View History/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`mac=${encodeURIComponent(mockClient.mac)}`)
      )
    })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/insights/device-history')
    )
  })

  it('does not show firewall rules section before history is expanded', () => {
    stubFetch([])
    render(<ClientCard client={mockClient} />)

    expect(screen.queryByText('Firewall rules')).not.toBeInTheDocument()
    expect(screen.queryByTestId('inline-firewall-rules')).not.toBeInTheDocument()
  })

  it('shows firewall rules section after expanding history', async () => {
    stubFetch([])
    render(<ClientCard client={mockClient} />)

    fireEvent.click(screen.getByRole('button', { name: /View History/i }))

    await waitFor(() => {
      expect(screen.getByText('Firewall rules')).toBeInTheDocument()
      expect(screen.getByTestId('inline-firewall-rules')).toBeInTheDocument()
    })
  })

  it('does not re-fetch when closing and reopening history', async () => {
    stubFetch([])
    render(<ClientCard client={mockClient} />)

    // Open
    fireEvent.click(screen.getByRole('button', { name: /View History/i }))
    await waitFor(() => screen.getByRole('button', { name: /Hide History/i }))

    // Close then reopen
    fireEvent.click(screen.getByRole('button', { name: /Hide History/i }))
    fireEvent.click(screen.getByRole('button', { name: /View History/i }))

    // Fetch called only once
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
