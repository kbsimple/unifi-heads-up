import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientCard } from '@/components/dashboard/client-card'
import { useTrafficHistory } from '@/contexts/traffic-history-context'
import type { NetworkClient } from '@/lib/unifi/types'

// Short-circuit the context module — no SWR, no provider side effects
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
  trafficStatus: 'medium',
}

function stubHistory(samples: Array<{ hourStart: number; avgDownload: number; avgUpload: number; sampleCount: number }>) {
  vi.mocked(useTrafficHistory).mockReturnValue({
    siteHistory: [],
    getClientHistory: (_id: string) => samples,
    isHistoryAvailable: samples.length > 0,
  })
}

describe('ClientCard history expansion (UAT-04-04)', () => {
  beforeEach(() => {
    vi.mocked(useTrafficHistory).mockReset()
  })

  it('starts with history hidden and button labeled "View History"', () => {
    stubHistory([])
    render(<ClientCard client={mockClient} />)
    const toggle = screen.getByRole('button', { name: /View History/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('toggles history panel and renders TrafficChart when context has samples', () => {
    const now = Date.now()
    const samples = [
      { hourStart: now - 3_600_000, avgDownload: 500_000, avgUpload: 100_000, sampleCount: 60 },
      { hourStart: now, avgDownload: 600_000, avgUpload: 120_000, sampleCount: 60 },
    ]
    stubHistory(samples)

    render(<ClientCard client={mockClient} />)
    fireEvent.click(screen.getByRole('button', { name: /View History/i }))

    // Button flipped
    expect(screen.getByRole('button', { name: /Hide History/i })).toHaveAttribute('aria-expanded', 'true')

    // Chart mounted via mocked ResponsiveContainer
    expect(screen.getByLabelText(/Traffic chart showing bandwidth over time/i)).toBeInTheDocument()
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    // No-history message must NOT appear
    expect(screen.queryByText(/No traffic history available yet/i)).not.toBeInTheDocument()
  })

  it('shows empty-state message (not chart) when context returns no samples', () => {
    stubHistory([])
    render(<ClientCard client={mockClient} />)
    fireEvent.click(screen.getByRole('button', { name: /View History/i }))

    expect(screen.getByText(/No traffic history available yet/i)).toBeInTheDocument()
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument()
  })
})
