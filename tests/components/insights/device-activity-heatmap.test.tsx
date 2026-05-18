// tests/components/insights/device-activity-heatmap.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeviceActivityHeatmap } from '@/components/insights/device-activity-heatmap'
import type { HourlyBucket } from '@/components/insights/device-activity-heatmap'
import type { TopDevice } from '@/components/insights/top-devices-chart'

const HOURLY_DATA: HourlyBucket[] = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  avgMbps: i >= 22 ? 3.5 : 0,
  active: i >= 22,
}))

const DEVICES: TopDevice[] = [
  { mac: 'aa:bb:cc:dd:ee:ff', totalBytes: 5e9, activeSeconds: 3600 },
  { mac: '11:22:33:44:55:66', totalBytes: 1e9, activeSeconds: 1800 },
]

const noop = () => {}

describe('DeviceActivityHeatmap', () => {
  it('renders exactly 24 heatmap cells when data is present', () => {
    const { container } = render(
      <DeviceActivityHeatmap
        data={HOURLY_DATA}
        isLoading={false}
        selectedMac="aa:bb:cc:dd:ee:ff"
        allDevices={DEVICES}
        onSelectDevice={noop}
      />
    )
    // Each cell has a title attribute like "22:00 — 3.50 Mbps"
    const cells = container.querySelectorAll('[title]')
    expect(cells).toHaveLength(24)
  })

  it('each cell has a tooltip title with hour and Mbps', () => {
    const { container } = render(
      <DeviceActivityHeatmap
        data={HOURLY_DATA}
        isLoading={false}
        selectedMac="aa:bb:cc:dd:ee:ff"
        allDevices={DEVICES}
        onSelectDevice={noop}
      />
    )
    const cell0 = container.querySelector('[title^="0:00"]')
    expect(cell0).toBeTruthy()
    expect(cell0?.getAttribute('title')).toMatch(/Mbps/)
  })

  it('shows skeleton when no device is selected', () => {
    const { container } = render(
      <DeviceActivityHeatmap
        data={undefined}
        isLoading={false}
        selectedMac={null}
        allDevices={DEVICES}
        onSelectDevice={noop}
      />
    )
    expect(container.querySelectorAll('[title]')).toHaveLength(0)
  })

  it('device dropdown is rendered when devices are available', () => {
    render(
      <DeviceActivityHeatmap
        data={HOURLY_DATA}
        isLoading={false}
        selectedMac="aa:bb:cc:dd:ee:ff"
        allDevices={DEVICES}
        onSelectDevice={noop}
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('changing device dropdown calls onSelectDevice with new mac', () => {
    const onSelect = vi.fn()
    render(
      <DeviceActivityHeatmap
        data={HOURLY_DATA}
        isLoading={false}
        selectedMac="aa:bb:cc:dd:ee:ff"
        allDevices={DEVICES}
        onSelectDevice={onSelect}
      />
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '11:22:33:44:55:66' } })
    expect(onSelect).toHaveBeenCalledWith('11:22:33:44:55:66')
  })

  it('shows legend entries', () => {
    render(
      <DeviceActivityHeatmap
        data={HOURLY_DATA}
        isLoading={false}
        selectedMac="aa:bb:cc:dd:ee:ff"
        allDevices={DEVICES}
        onSelectDevice={noop}
      />
    )
    expect(screen.getByText('Idle')).toBeInTheDocument()
    expect(screen.getByText('Peak')).toBeInTheDocument()
  })
})
