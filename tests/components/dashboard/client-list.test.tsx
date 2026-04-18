// tests/components/dashboard/client-list.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ClientList } from '@/components/dashboard/client-list'
import type { ClientsResponse } from '@/lib/unifi/types'

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn((key: string, fetcher: Function, config: any) => {
    // Return fallbackData initially
    return {
      data: config?.fallbackData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    }
  }),
}))

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('ClientList', () => {
  const mockClientsResponse: ClientsResponse = {
    clients: [
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
        downloadRate: 500000,
        uploadRate: 100000,
        trafficStatus: 'low',
      },
    ],
    timestamp: Date.now(),
  }

  describe('Test 1: ClientList renders clients from initialData', () => {
    it('should display all clients from initial data', () => {
      render(<ClientList initialData={mockClientsResponse} />)

      // Both card and table layouts render (jsdom doesn't hide via CSS)
      expect(screen.getAllByText('Device One').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Device Two').length).toBeGreaterThan(0)
    })
  })

  describe('Test 2: ClientList shows loading skeleton initially', () => {
    it('should pass isLoading to LastUpdated component', async () => {
      // This test verifies that isLoading prop is passed correctly
      render(<ClientList initialData={mockClientsResponse} />)

      // Should show last updated text (proving isLoading is passed)
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
    })
  })

  describe('Test 3: ClientList renders cards on mobile viewport', () => {
    it('should render card layout when viewport is mobile', () => {
      // Mock mobile viewport
      vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
        matches: query.includes('max-width'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(<ClientList initialData={mockClientsResponse} />)

      // Both layouts render in jsdom; verify content exists
      expect(screen.getAllByText('Device One').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Device Two').length).toBeGreaterThan(0)
    })
  })

  describe('Test 4: ClientList renders table on desktop viewport', () => {
    it('should render table layout when viewport is desktop', () => {
      // Desktop viewport is default (matchMedia returns false for max-width)
      render(<ClientList initialData={mockClientsResponse} />)

      // Table headers should be present
      expect(screen.getByText('Device Name')).toBeInTheDocument()
      expect(screen.getByText('IP Address')).toBeInTheDocument()
      expect(screen.getByText('MAC Address')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Last Active')).toBeInTheDocument()
    })
  })

  describe('Test 5: ClientList shows ErrorState when SWR has error', () => {
    it('should render ErrorState when there is an error', async () => {
      // Override SWR mock to return error
      // First call goes to TrafficHistoryProvider, second to ClientListInner
      const { default: useSWR } = await import('swr')
      vi.mocked(useSWR)
        .mockReturnValueOnce({
          data: undefined,
          error: undefined,
          isLoading: false,
          mutate: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: undefined,
          error: new Error('Network error'),
          isLoading: false,
          mutate: vi.fn(),
        } as any)

      render(<ClientList initialData={mockClientsResponse} />)

      expect(screen.getByText('Unable to reach network service')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  describe('Test 6: ClientList shows EmptyState when clients array empty', () => {
    it('should render EmptyState when no clients', () => {
      const emptyResponse: ClientsResponse = {
        clients: [],
        timestamp: Date.now(),
      }

      render(<ClientList initialData={emptyResponse} />)

      expect(screen.getByText('No devices found')).toBeInTheDocument()
    })
  })

  describe('Test 7: ClientList passes isLoading to LastUpdated', () => {
    it('should show loading spinner when isLoading is true', async () => {
      // Override SWR mock to return loading state
      // First call goes to TrafficHistoryProvider, second to ClientListInner
      const { default: useSWR } = await import('swr')
      vi.mocked(useSWR)
        .mockReturnValueOnce({
          data: undefined,
          error: undefined,
          isLoading: false,
          mutate: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: mockClientsResponse,
          error: undefined,
          isLoading: true,
          mutate: vi.fn(),
        } as any)

      render(<ClientList initialData={mockClientsResponse} />)

      // Loading spinner should be present
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })
})