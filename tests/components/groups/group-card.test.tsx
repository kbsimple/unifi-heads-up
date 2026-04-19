import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GroupCard } from '@/components/groups/group-card'
import type { NetworkClient } from '@/lib/unifi/types'
import type { DeviceGroup } from '@/lib/types/group'

function makeClient(over: Partial<NetworkClient> = {}): NetworkClient {
  return {
    id: 'c-1',
    mac: 'AA:BB:CC:DD:EE:01',
    displayName: 'Device 1',
    ip: '192.168.1.10',
    lastSeen: new Date('2026-04-18T00:00:00Z'),
    isWired: true,
    isGuest: false,
    downloadRate: 0,
    uploadRate: 0,
    trafficStatus: 'idle',
    ...over,
  }
}

const baseGroup: DeviceGroup = {
  id: 'g-1',
  name: 'Kids Devices',
  deviceIds: ['c-1', 'c-2'],
}

describe('GroupCard aggregated TrafficBadge (UAT-04-02)', () => {
  it('renders High badge when combined rate > 1MB/s', () => {
    const devices = [
      makeClient({ id: 'c-1', downloadRate: 600_000, uploadRate: 0, trafficStatus: 'medium' }),
      makeClient({ id: 'c-2', displayName: 'Device 2', downloadRate: 500_000, uploadRate: 0, trafficStatus: 'medium' }),
    ]
    render(
      <GroupCard
        group={baseGroup}
        devices={devices}
        onRemoveDevice={vi.fn()}
        onDelete={vi.fn()}
        onAddDevices={vi.fn()}
      />
    )
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('renders Medium badge when combined rate between 100KB/s and 1MB/s', () => {
    const devices = [
      makeClient({ id: 'c-1', downloadRate: 200_000, uploadRate: 0, trafficStatus: 'low' }),
      makeClient({ id: 'c-2', displayName: 'Device 2', downloadRate: 100_000, uploadRate: 0, trafficStatus: 'low' }),
    ]
    render(
      <GroupCard
        group={baseGroup}
        devices={devices}
        onRemoveDevice={vi.fn()}
        onDelete={vi.fn()}
        onAddDevices={vi.fn()}
      />
    )
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('renders Idle badge when combined rate is 0', () => {
    const devices = [
      makeClient({ id: 'c-1', downloadRate: 0, uploadRate: 0 }),
      makeClient({ id: 'c-2', displayName: 'Device 2', downloadRate: 0, uploadRate: 0 }),
    ]
    render(
      <GroupCard
        group={baseGroup}
        devices={devices}
        onRemoveDevice={vi.fn()}
        onDelete={vi.fn()}
        onAddDevices={vi.fn()}
      />
    )
    expect(screen.getByText('Idle')).toBeInTheDocument()
  })
})

describe('GroupCard DeviceChip X removes device (UAT-04-03)', () => {
  it('invokes onRemoveDevice with (groupId, deviceId) when X clicked', () => {
    const onRemoveDevice = vi.fn()
    const devices = [
      makeClient({ id: 'c-1', displayName: 'Device One' }),
      makeClient({ id: 'c-2', displayName: 'Device Two' }),
    ]
    render(
      <GroupCard
        group={baseGroup}
        devices={devices}
        onRemoveDevice={onRemoveDevice}
        onDelete={vi.fn()}
        onAddDevices={vi.fn()}
      />
    )

    // Expand card via the aria-expanded button (disambiguates from the delete button)
    const toggle = document.querySelector('button[aria-expanded]') as HTMLButtonElement
    expect(toggle).not.toBeNull()
    fireEvent.click(toggle)

    // DeviceChip X button has aria-label "Remove <displayName> from group"
    const removeBtn = screen.getByLabelText('Remove Device One from group')
    fireEvent.click(removeBtn)

    expect(onRemoveDevice).toHaveBeenCalledTimes(1)
    expect(onRemoveDevice).toHaveBeenCalledWith('g-1', 'c-1')
  })
})
