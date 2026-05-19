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
}

function stubContext(lastBusy: number | null = null) {
  vi.mocked(useTrafficHistory).mockReturnValue({
    siteHistory: [],
    getClientHistory: () => [],
    getClientLastBusy: () => lastBusy,
    isHistoryAvailable: false,
  })
}

// Hourly bucket shape returned by /api/insights/device-activity
interface HourlyBucket {
  hour: number
  avgMbps: number
  active: boolean
}

function stubFetch(buckets: HourlyBucket[]) {
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
    expect(await screen.findByText(/Loading history/i)).toBeInTheDocument()
  })

  it('renders TrafficChart when DB returns active buckets', async () => {
    const buckets: HourlyBucket[] = [
      { hour: 10, avgMbps: 5.2, active: true },
      { hour: 11, avgMbps: 3.1, active: true },
      // zero-traffic hours are filtered out
      { hour: 12, avgMbps: 0, active: false },
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

  it('shows empty-state message when DB returns all-zero buckets', async () => {
    const buckets: HourlyBucket[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      avgMbps: 0,
      active: false,
    }))
    stubFetch(buckets)

    render(<ClientCard client={mockClient} />)
    fireEvent.click(screen.getByRole('button', { name: /View History/i }))

    await waitFor(() => {
      expect(screen.getByText(/No traffic history recorded yet/i)).toBeInTheDocument()
    })
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument()
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
      expect.stringContaining('/api/insights/device-activity')
    )
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
