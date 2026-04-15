// tests/app/dashboard/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock dependencies
vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(() => Promise.resolve({ isAuth: true, username: 'admin' })),
}))

vi.mock('@/lib/unifi/client', () => ({
  getUnifiClients: vi.fn(() =>
    Promise.resolve({
      clients: [
        {
          id: 'client-1',
          mac: 'AA:BB:CC:DD:EE:FF',
          displayName: 'Test Device',
          ip: '192.168.1.100',
          lastSeen: new Date(),
          isWired: true,
          isGuest: false,
          downloadRate: 1250000,
          uploadRate: 250000,
          trafficStatus: 'medium',
        },
      ],
      timestamp: Date.now(),
    })
  ),
}))

vi.mock('@/components/dashboard/client-list', () => ({
  ClientList: ({ initialData }: { initialData: any }) => (
    <div data-testid="client-list" data-clients={initialData.clients.length}>
      ClientList rendered with {initialData.clients.length} clients
    </div>
  ),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Test 1: Dashboard page renders ClientList with initial data', () => {
    it('should render ClientList component with fetched data', async () => {
      // Dynamic import to apply mocks
      const { default: DashboardPage } = await import('@/app/(dashboard)/page')

      render(await DashboardPage())

      expect(screen.getByTestId('client-list')).toBeInTheDocument()
      expect(screen.getByText(/ClientList rendered with 1 clients/)).toBeInTheDocument()
    })
  })

  describe('Test 2: Dashboard page calls verifySession', () => {
    it('should verify user session before rendering', async () => {
      const { verifySession } = await import('@/lib/dal')
      const { default: DashboardPage } = await import('@/app/(dashboard)/page')

      render(await DashboardPage())

      expect(verifySession).toHaveBeenCalled()
    })
  })

  describe('Test 3: Dashboard page shows section title', () => {
    it('should display Network Clients heading', async () => {
      const { default: DashboardPage } = await import('@/app/(dashboard)/page')

      render(await DashboardPage())

      expect(screen.getByText('Network Clients')).toBeInTheDocument()
    })
  })
})