// tests/components/insights/top-devices-chart.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopDevicesChart } from '@/components/insights/top-devices-chart'

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ onClick, children }: { onClick: unknown; children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: ({ fill }: { fill: string }) => <div data-fill={fill} />,
}))

const noop = () => {}

describe('TopDevicesChart', () => {
  it('shows skeleton while loading', () => {
    const { container } = render(
      <TopDevicesChart data={undefined} isLoading={true} selectedMac={null} onSelectDevice={noop} />
    )
    expect(container.querySelector('.animate-pulse, [class*="skeleton"], [class*="Skeleton"]') ??
      container.firstChild).toBeTruthy()
  })

  it('shows empty state when data is empty array', () => {
    render(<TopDevicesChart data={[]} isLoading={false} selectedMac={null} onSelectDevice={noop} />)
    expect(screen.getByText('No traffic data available for this period.')).toBeInTheDocument()
  })

  it('renders bar chart when data is present', () => {
    const data = [
      { mac: 'aa:bb:cc:dd:ee:ff', totalBytes: 5e9 },
      { mac: '11:22:33:44:55:66', totalBytes: 1e9 },
    ]
    render(<TopDevicesChart data={data} isLoading={false} selectedMac={null} onSelectDevice={noop} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('has accessible label on chart container', () => {
    const data = [{ mac: 'aa:bb:cc:dd:ee:ff', totalBytes: 1e9 }]
    render(<TopDevicesChart data={data} isLoading={false} selectedMac={null} onSelectDevice={noop} />)
    expect(screen.getByRole('img', { name: /top devices by bandwidth/i })).toBeInTheDocument()
  })
})
