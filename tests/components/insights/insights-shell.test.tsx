// tests/components/insights/insights-shell.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InsightsShell } from '@/components/insights/insights-shell'

const mockUseSWR = vi.fn()
vi.mock('swr', () => ({ default: (...args: unknown[]) => mockUseSWR(...args) }))

vi.mock('@/components/insights/top-devices-chart', () => ({
  TopDevicesChart: ({ data, isLoading, onSelectDevice }: { data: unknown; isLoading: boolean; onSelectDevice: (mac: string) => void }) => (
    <div data-testid="top-devices-chart">
      {isLoading ? 'loading' : data ? `devices:${(data as []).length}` : 'empty'}
      <button onClick={() => onSelectDevice('aa:bb:cc:dd:ee:ff')}>select-device</button>
    </div>
  ),
}))

vi.mock('@/components/insights/device-activity-heatmap', () => ({
  DeviceActivityHeatmap: ({ selectedMac, onSelectDevice }: { selectedMac: string | null; onSelectDevice: (mac: string) => void }) => (
    <div data-testid="device-activity-heatmap" data-mac={selectedMac ?? ''}>
      <button onClick={() => onSelectDevice('ff:ee:dd:cc:bb:aa')}>change-device</button>
    </div>
  ),
}))

const TOP_DEVICES = [
  { mac: 'aa:bb:cc:dd:ee:ff', totalBytes: 5e9 },
  { mac: '11:22:33:44:55:66', totalBytes: 1e9 },
]

const HOURLY_DATA = Array.from({ length: 24 }, (_, i) => ({ hour: i, avgMbps: i * 0.1, active: i > 10 }))

function setupSWR(topDevices = TOP_DEVICES, activityData = HOURLY_DATA) {
  mockUseSWR.mockImplementation((key: string | null) => {
    if (key === null) return { data: undefined, isLoading: false }
    if (typeof key === 'string' && key.includes('top-devices'))
      return { data: topDevices, isLoading: false }
    if (typeof key === 'string' && key.includes('device-activity'))
      return { data: activityData, isLoading: false }
    return { data: undefined, isLoading: false }
  })
}

beforeEach(() => {
  mockUseSWR.mockReset()
  setupSWR()
})

describe('InsightsShell', () => {
  it('renders all six time-range tabs', () => {
    render(<InsightsShell />)
    expect(screen.getByText('5 min')).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getByText('1 hr')).toBeInTheDocument()
    expect(screen.getByText('7 days')).toBeInTheDocument()
    expect(screen.getByText('14 days')).toBeInTheDocument()
    expect(screen.getByText('30 days')).toBeInTheDocument()
  })

  it('fetches top-devices with default 7-day range', () => {
    render(<InsightsShell />)
    const keys = mockUseSWR.mock.calls.map(c => c[0])
    expect(keys.some((k: string) => k?.includes('minutes=10080'))).toBe(true)
  })

  it('switching to 5 min triggers new fetch with minutes=5', async () => {
    render(<InsightsShell />)
    fireEvent.click(screen.getByText('5 min'))
    await waitFor(() => {
      const keys = mockUseSWR.mock.calls.map(c => c[0])
      expect(keys.some((k: string) => k?.includes('minutes=5'))).toBe(true)
    })
  })

  it('switching to 1 hr triggers new fetch with minutes=60', async () => {
    render(<InsightsShell />)
    fireEvent.click(screen.getByText('1 hr'))
    await waitFor(() => {
      const keys = mockUseSWR.mock.calls.map(c => c[0])
      expect(keys.some((k: string) => k?.includes('minutes=60'))).toBe(true)
    })
  })

  it('switching to 14 days triggers new fetch with minutes=20160', async () => {
    render(<InsightsShell />)
    fireEvent.click(screen.getByText('14 days'))
    await waitFor(() => {
      const keys = mockUseSWR.mock.calls.map(c => c[0])
      expect(keys.some((k: string) => k?.includes('minutes=20160'))).toBe(true)
    })
  })

  it('switching to 30 days triggers new fetch with minutes=43200', async () => {
    render(<InsightsShell />)
    fireEvent.click(screen.getByText('30 days'))
    await waitFor(() => {
      const keys = mockUseSWR.mock.calls.map(c => c[0])
      expect(keys.some((k: string) => k?.includes('minutes=43200'))).toBe(true)
    })
  })

  it('auto-selects first device and fetches activity data for it', async () => {
    render(<InsightsShell />)
    await waitFor(() => {
      const keys = mockUseSWR.mock.calls.map(c => c[0])
      expect(keys.some((k: string) => k?.includes('mac=aa%3Abb%3Acc%3Add%3Aee%3Aff'))).toBe(true)
    })
  })

  it('clicking a device in TopDevicesChart updates the activity heatmap mac', async () => {
    render(<InsightsShell />)
    fireEvent.click(screen.getByText('select-device'))
    await waitFor(() => {
      expect(screen.getByTestId('device-activity-heatmap').dataset.mac).toBe('aa:bb:cc:dd:ee:ff')
    })
  })

  it('renders Top Devices and Device Activity section headings', () => {
    render(<InsightsShell />)
    expect(screen.getByText('Top Devices')).toBeInTheDocument()
    expect(screen.getByText('Device Activity')).toBeInTheDocument()
  })

  it('does not crash when top-devices returns empty array', () => {
    setupSWR([], HOURLY_DATA)
    expect(() => render(<InsightsShell />)).not.toThrow()
  })
})
