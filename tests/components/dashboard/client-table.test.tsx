// tests/components/dashboard/client-table.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientTable } from '@/components/dashboard/client-table'
import type { NetworkClient } from '@/lib/unifi/types'

// Mock useTrafficHistory — no history by default
vi.mock('@/contexts/traffic-history-context', () => ({
  useTrafficHistory: vi.fn(() => ({
    siteHistory: [],
    getClientHistory: () => [],
    getClientLastBusy: () => null,
    isHistoryAvailable: false,
  })),
}))

import { useTrafficHistory } from '@/contexts/traffic-history-context'

function makeClient(overrides: Partial<NetworkClient> & { id: string; displayName: string }): NetworkClient {
  return {
    id: overrides.id,
    mac: overrides.mac ?? `aa:bb:cc:dd:ee:0${overrides.id}`,
    displayName: overrides.displayName,
    ip: overrides.ip ?? null,
    lastSeen: overrides.lastSeen ?? null,
    isWired: overrides.isWired ?? false,
    isGuest: overrides.isGuest ?? false,
    downloadRate: overrides.downloadRate ?? 0,
    uploadRate: overrides.uploadRate ?? 0,
    trafficStatus: overrides.trafficStatus ?? 'idle',
  }
}

const CLIENTS: NetworkClient[] = [
  makeClient({ id: '1', displayName: 'Zebra',  ip: '192.168.1.30', mac: 'cc:cc:cc:cc:cc:cc', trafficStatus: 'high' }),
  makeClient({ id: '2', displayName: 'Apple',  ip: '192.168.1.10', mac: 'aa:aa:aa:aa:aa:aa', trafficStatus: 'idle' }),
  makeClient({ id: '3', displayName: 'Mango',  ip: '192.168.1.20', mac: 'bb:bb:bb:bb:bb:bb', trafficStatus: 'medium' }),
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useTrafficHistory).mockReturnValue({
    siteHistory: [],
    getClientHistory: () => [],
    getClientLastBusy: () => null,
    isHistoryAvailable: false,
  })
})

describe('ClientTable rendering', () => {
  it('renders all client rows', () => {
    render(<ClientTable clients={CLIENTS} />)
    expect(screen.getByText('Zebra')).toBeInTheDocument()
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.getByText('Mango')).toBeInTheDocument()
  })

  it('renders column headers', () => {
    render(<ClientTable clients={CLIENTS} />)
    expect(screen.getByText(/Device Name/i)).toBeInTheDocument()
    expect(screen.getByText(/IP Address/i)).toBeInTheDocument()
    expect(screen.getByText(/MAC Address/i)).toBeInTheDocument()
    expect(screen.getByText(/Last Busy/i)).toBeInTheDocument()
  })

  it('Status column header contains "(?)"', () => {
    render(<ClientTable clients={CLIENTS} />)
    expect(screen.getByText('(?)')).toBeInTheDocument()
  })

  it('shows "No IP" for clients with null ip', () => {
    const clientNoIp = makeClient({ id: '9', displayName: 'NoIp', ip: null })
    render(<ClientTable clients={[clientNoIp]} />)
    expect(screen.getByText('No IP')).toBeInTheDocument()
  })

  it('renders multiple client rows with data', () => {
    render(<ClientTable clients={CLIENTS} />)
    expect(screen.getByText('192.168.1.10')).toBeInTheDocument()
    expect(screen.getByText('aa:aa:aa:aa:aa:aa')).toBeInTheDocument()
  })
})

describe('ClientTable default sort', () => {
  it('no default sort — preserves API order (Zebra first)', () => {
    render(<ClientTable clients={CLIENTS} />)
    const rows = screen.getAllByRole('row')
    // rows[0] = header, rows[1..n] = data rows
    // CLIENTS is [Zebra, Apple, Mango] — API order preserved
    expect(rows[1]).toHaveTextContent('Zebra')
    expect(rows[3]).toHaveTextContent('Mango')
  })

  it('all columns show ↕ by default', () => {
    render(<ClientTable clients={CLIENTS} />)
    const inactive = screen.getAllByText('↕')
    // 5 inactive columns: displayName, ip, mac, trafficStatus, lastBusy
    expect(inactive.length).toBe(5)
  })
})

describe('ClientTable sorting by displayName', () => {
  it('clicking "Device Name" activates ascending sort — Apple first', () => {
    render(<ClientTable clients={CLIENTS} />)
    const header = screen.getByText(/Device Name/i).closest('th')!
    // First click: sets displayName asc
    fireEvent.click(header)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Apple')
    expect(rows[3]).toHaveTextContent('Zebra')
  })

  it('clicking "Device Name" twice toggles to descending — Zebra first', () => {
    render(<ClientTable clients={CLIENTS} />)
    const header = screen.getByText(/Device Name/i).closest('th')!
    fireEvent.click(header) // → asc
    fireEvent.click(header) // → desc
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Zebra')
    expect(rows[3]).toHaveTextContent('Apple')
  })

  it('clicking "Device Name" three times returns to ascending — Apple first', () => {
    render(<ClientTable clients={CLIENTS} />)
    const header = screen.getByText(/Device Name/i).closest('th')!
    fireEvent.click(header) // → asc
    fireEvent.click(header) // → desc
    fireEvent.click(header) // → asc
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Apple')
    expect(rows[3]).toHaveTextContent('Zebra')
  })

  it('active sort column shows ↓ after toggling to desc', () => {
    render(<ClientTable clients={CLIENTS} />)
    const header = screen.getByText(/Device Name/i).closest('th')!
    fireEvent.click(header) // → asc
    fireEvent.click(header) // → desc
    expect(screen.getAllByText('↓').length).toBeGreaterThan(0)
  })
})

describe('ClientTable sorting by trafficStatus', () => {
  it('clicking "Status" sorts ascending — idle first', () => {
    render(<ClientTable clients={CLIENTS} />)
    const statusTh = screen.getByText('Status').closest('th')!
    fireEvent.click(statusTh)
    const rows = screen.getAllByRole('row')
    // idle(0) < medium(2) < high(3)
    expect(rows[1]).toHaveTextContent('Apple')  // idle
    expect(rows[3]).toHaveTextContent('Zebra')  // high
  })

  it('clicking "Status" twice sorts descending — high first', () => {
    render(<ClientTable clients={CLIENTS} />)
    const statusTh = screen.getByText('Status').closest('th')!
    fireEvent.click(statusTh) // asc
    fireEvent.click(statusTh) // desc
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Zebra')  // high
    expect(rows[3]).toHaveTextContent('Apple')  // idle
  })

  it('TrafficBadge renders status label text for each client', () => {
    render(<ClientTable clients={CLIENTS} />)
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Idle')).toBeInTheDocument()
  })
})

describe('ClientTable sorting by IP', () => {
  it('clicking "IP Address" sorts numerically ascending', () => {
    render(<ClientTable clients={CLIENTS} />)
    const ipHeader = screen.getByText(/IP Address/i).closest('th')!
    fireEvent.click(ipHeader)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Apple') // 192.168.1.10
    expect(rows[2]).toHaveTextContent('Mango') // 192.168.1.20
    expect(rows[3]).toHaveTextContent('Zebra') // 192.168.1.30
  })

  it('clicking "IP Address" again sorts numerically descending', () => {
    render(<ClientTable clients={CLIENTS} />)
    const ipHeader = screen.getByText(/IP Address/i).closest('th')!
    fireEvent.click(ipHeader)
    fireEvent.click(ipHeader)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Zebra') // 192.168.1.30
    expect(rows[3]).toHaveTextContent('Apple') // 192.168.1.10
  })
})

describe('ClientTable sorting by MAC', () => {
  it('clicking "MAC Address" sorts alphabetically ascending', () => {
    render(<ClientTable clients={CLIENTS} />)
    const macHeader = screen.getByText(/MAC Address/i).closest('th')!
    fireEvent.click(macHeader)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Apple') // aa:aa...
    expect(rows[3]).toHaveTextContent('Zebra') // cc:cc...
  })

  it('clicking "MAC Address" again sorts alphabetically descending', () => {
    render(<ClientTable clients={CLIENTS} />)
    const macHeader = screen.getByText(/MAC Address/i).closest('th')!
    fireEvent.click(macHeader)
    fireEvent.click(macHeader)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Zebra') // cc:cc...
    expect(rows[3]).toHaveTextContent('Apple') // aa:aa...
  })
})

describe('ClientTable sort indicator transitions', () => {
  it('switching to a new column resets direction to asc and shows ↑ once', () => {
    render(<ClientTable clients={CLIENTS} />)
    const ipHeader = screen.getByText(/IP Address/i).closest('th')!
    fireEvent.click(ipHeader)
    expect(screen.getAllByText('↑').length).toBe(1)
    expect(screen.getAllByText('↕').length).toBe(4)
  })
})

describe('ClientTable lastBusy column', () => {
  it('shows formatted time when getClientLastBusy returns a timestamp', () => {
    const NOW = new Date('2024-06-15T12:00:00.000Z').getTime()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    vi.mocked(useTrafficHistory).mockReturnValue({
      siteHistory: [],
      getClientHistory: () => [],
      getClientLastBusy: (id) => (id === '1' ? NOW - 5 * 60_000 : null),
      isHistoryAvailable: false,
    })
    render(<ClientTable clients={CLIENTS} />)
    expect(screen.getByText('5m ago')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('shows "—" when getClientLastBusy returns null for all clients', () => {
    render(<ClientTable clients={CLIENTS} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBe(CLIENTS.length)
  })
})
