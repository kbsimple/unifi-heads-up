// tests/components/dashboard/client-table.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientTable } from '@/components/dashboard/client-table'
import type { NetworkClient } from '@/lib/unifi/types'

describe('ClientTable', () => {
  const mockClients: NetworkClient[] = [
    {
      id: 'client-1',
      mac: 'AA:BB:CC:DD:EE:FF',
      displayName: 'Device One',
      ip: '192.168.1.100',
      lastSeen: new Date('2026-04-15T05:00:00Z'),
      isWired: true,
      isGuest: false,
      downloadRate: 1250000,
      uploadRate: 250000,
      trafficStatus: 'medium',
    },
    {
      id: 'client-2',
      mac: '11:22:33:44:55:66',
      displayName: 'Device Two',
      ip: '192.168.1.101',
      lastSeen: new Date('2026-04-15T04:30:00Z'),
      isWired: false,
      isGuest: false,
      downloadRate: 125000,
      uploadRate: 125000,
      trafficStatus: 'low',
    },
  ]

  it('should render table with headers', () => {
    render(<ClientTable clients={mockClients} />)

    expect(screen.getByText('Device Name')).toBeInTheDocument()
    expect(screen.getByText('IP Address')).toBeInTheDocument()
    expect(screen.getByText('MAC Address')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Last Active')).toBeInTheDocument()
  })

  it('should render multiple client rows', () => {
    render(<ClientTable clients={mockClients} />)

    expect(screen.getByText('Device One')).toBeInTheDocument()
    expect(screen.getByText('Device Two')).toBeInTheDocument()
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
    expect(screen.getByText('192.168.1.101')).toBeInTheDocument()
    expect(screen.getByText('AA:BB:CC:DD:EE:FF')).toBeInTheDocument()
    expect(screen.getByText('11:22:33:44:55:66')).toBeInTheDocument()
  })

  it('should show "No IP" for clients with null IP', () => {
    const clientNoIp: NetworkClient[] = [
      {
        id: 'client-3',
        mac: 'AA:BB:CC:11:22:33',
        displayName: 'No IP Device',
        ip: null,
        lastSeen: new Date('2026-04-15T05:00:00Z'),
        isWired: true,
        isGuest: false,
        downloadRate: 0,
        uploadRate: 0,
        trafficStatus: 'idle',
      },
    ]
    render(<ClientTable clients={clientNoIp} />)

    expect(screen.getByText('No IP')).toBeInTheDocument()
  })
})