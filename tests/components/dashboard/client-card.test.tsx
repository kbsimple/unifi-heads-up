// tests/components/dashboard/client-card.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientCard } from '@/components/dashboard/client-card'
import type { NetworkClient } from '@/lib/unifi/types'

describe('ClientCard', () => {
  const mockClient: NetworkClient = {
    id: 'client-1',
    mac: 'AA:BB:CC:DD:EE:FF',
    displayName: 'Test Device',
    ip: '192.168.1.100',
    lastSeen: new Date('2026-04-15T05:00:00Z'),
    isWired: true,
    isGuest: false,
    downloadRate: 1250000,
    uploadRate: 250000,
    trafficStatus: 'medium',
  }

  it('should display device name, IP, MAC, and badge', () => {
    render(<ClientCard client={mockClient} />)

    expect(screen.getByText('Test Device')).toBeInTheDocument()
    expect(screen.getByText(/192.168.1.100/)).toBeInTheDocument()
    expect(screen.getByText(/AA:BB:CC:DD:EE:FF/)).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('should show "No IP" when ip is null', () => {
    const clientNoIp = { ...mockClient, ip: null }
    render(<ClientCard client={clientNoIp} />)

    expect(screen.getByText(/No IP/)).toBeInTheDocument()
  })

  it('should show last active time', () => {
    render(<ClientCard client={mockClient} />)

    expect(screen.getByText(/Last active:/)).toBeInTheDocument()
  })
})