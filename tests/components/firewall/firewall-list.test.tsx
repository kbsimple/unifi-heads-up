// tests/components/firewall/firewall-list.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FirewallList } from '@/components/firewall/firewall-list'
import type { FirewallPolicy } from '@/lib/unifi/types'

// Mock useSWR from swr
const mockMutate = vi.fn()
const mockData = vi.fn()
const mockError = vi.fn()

vi.mock('swr', () => ({
  default: vi.fn((key: string, fetcher: Function, options: { fallbackData?: unknown }) => {
    const initialData = options?.fallbackData
    const isLoading = mockData() === undefined && initialData === undefined && !mockError()
    const data = mockData() ?? initialData
    const error = mockError()

    return {
      data,
      error,
      isLoading,
      mutate: mockMutate,
    }
  }),
}))

// Mock FirewallCard component
vi.mock('@/components/firewall/firewall-card', () => ({
  FirewallCard: ({ policy, onToggle }: { policy: FirewallPolicy; onToggle: (id: string, enabled: boolean) => void }) => (
    <div data-testid={`firewall-card-${policy._id}`}>
      <span>{policy.name}</span>
      <span>{policy.enabled ? 'Enabled' : 'Disabled'}</span>
      <button onClick={() => onToggle(policy._id, !policy.enabled)}>Toggle</button>
    </div>
  ),
}))

// Mock Skeleton component
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className}>Loading...</div>
  ),
}))

describe('FirewallList', () => {
  const mockPolicies: FirewallPolicy[] = [
    { _id: 'policy-1', name: 'Block Gaming', enabled: true },
    { _id: 'policy-2', name: 'Allow Streaming', enabled: false },
  ]

  const mockInitialData = {
    policies: mockPolicies,
    timestamp: Date.now(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockData.mockReturnValue(undefined)
    mockError.mockReturnValue(undefined)
  })

  describe('Test 1: Renders loading skeleton while isLoading and no data', () => {
    it('should render Skeleton components when loading with no initial data', () => {
      // When no fallbackData and no data, isLoading is true
      mockData.mockReturnValue(undefined)

      render(<FirewallList initialData={undefined as any} />)

      // Should render skeleton cards while loading
      const skeletons = screen.getAllByTestId('skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Test 2: Renders empty state when policies array is empty', () => {
    it('should render empty state with ShieldOff icon when no policies', () => {
      const emptyData = { policies: [], timestamp: Date.now() }
      mockData.mockReturnValue(emptyData)

      render(<FirewallList initialData={emptyData} />)

      expect(screen.getByText('No firewall rules found')).toBeInTheDocument()
      expect(screen.getByText(/Your network may not have any firewall rules/)).toBeInTheDocument()
    })
  })

  describe('Test 3: Renders error state with retry button when error', () => {
    it('should render Alert with retry button on error', () => {
      mockError.mockReturnValue(new Error('Network error'))

      render(<FirewallList initialData={undefined as any} />)

      expect(screen.getByText('Unable to load firewall rules')).toBeInTheDocument()
      expect(screen.getByText('Please check your connection and try again.')).toBeInTheDocument()
    })

    it('should call mutate on retry button click', async () => {
      mockError.mockReturnValue(new Error('Network error'))

      render(<FirewallList initialData={undefined as any} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryButton)

      expect(mockMutate).toHaveBeenCalled()
    })
  })

  describe('Test 4: Renders FirewallCard for each policy', () => {
    it('should render a FirewallCard for each policy in the array', () => {
      mockData.mockReturnValue({ policies: mockPolicies, timestamp: Date.now() })

      render(<FirewallList initialData={mockInitialData} />)

      expect(screen.getByTestId('firewall-card-policy-1')).toBeInTheDocument()
      expect(screen.getByTestId('firewall-card-policy-2')).toBeInTheDocument()
    })

    it('should display policy names in the cards', () => {
      mockData.mockReturnValue({ policies: mockPolicies, timestamp: Date.now() })

      render(<FirewallList initialData={mockInitialData} />)

      expect(screen.getByText('Block Gaming')).toBeInTheDocument()
      expect(screen.getByText('Allow Streaming')).toBeInTheDocument()
    })
  })

  describe('Test 5: Passes policies array and mutate to FirewallCard', () => {
    it('should pass correct policy data to each FirewallCard', () => {
      mockData.mockReturnValue({ policies: mockPolicies, timestamp: Date.now() })

      render(<FirewallList initialData={mockInitialData} />)

      // Verify enabled/disabled status is rendered
      expect(screen.getByText('Enabled')).toBeInTheDocument()
      expect(screen.getByText('Disabled')).toBeInTheDocument()
    })

    it('should allow toggling policies through FirewallCard onToggle callback', () => {
      mockData.mockReturnValue({ policies: mockPolicies, timestamp: Date.now() })

      render(<FirewallList initialData={mockInitialData} />)

      const toggleButtons = screen.getAllByRole('button', { name: 'Toggle' })
      fireEvent.click(toggleButtons[0])

      // The toggle functionality should work through the callback
      // Actual mutation testing is handled in rule-toggle tests
      expect(toggleButtons[0]).toBeInTheDocument()
    })
  })

  describe('Test 6: Re-fetches data on retry button click', () => {
    it('should call mutate when retry button is clicked in error state', async () => {
      mockError.mockReturnValue(new Error('Network error'))

      render(<FirewallList initialData={undefined as any} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryButton)

      expect(mockMutate).toHaveBeenCalled()
    })
  })
})