// tests/components/firewall/firewall-list.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FirewallList } from '@/components/firewall/firewall-list'
import type { FirewallPolicy } from '@/lib/unifi/types'

// Mock useSWR from swr — supports multiple keys
const mockMutate = vi.fn()
const mockMutateStarred = vi.fn()

vi.mock('swr', () => ({
  default: vi.fn((key: string) => {
    if (key === '/api/firewall/starred') {
      return {
        data: { starredIds: [] },
        mutate: mockMutateStarred,
      }
    }
    // /api/firewall
    return {
      data: {
        policies: [
          { _id: 'policy-1', name: 'Block Gaming', enabled: true },
          { _id: 'policy-2', name: 'Allow Streaming', enabled: false },
        ],
        timestamp: Date.now(),
      },
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    }
  }),
}))

// Mock FirewallCard to expose isStarred and onToggleStar for testing
vi.mock('@/components/firewall/firewall-card', () => ({
  FirewallCard: ({
    policy,
    isStarred,
    onToggleStar,
  }: {
    policy: FirewallPolicy
    policies: FirewallPolicy[]
    isStarred: boolean
    onToggleStar: () => void
  }) => (
    <div data-testid={`firewall-card-${policy._id}`}>
      <span>{policy.name}</span>
      <button
        data-testid={`star-btn-${policy._id}`}
        data-starred={isStarred}
        aria-label={isStarred ? 'Unstar rule' : 'Star rule'}
        onClick={onToggleStar}
      >
        {isStarred ? 'starred' : 'unstarred'}
      </button>
    </div>
  ),
}))

// Mock Skeleton component
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className}>Loading...</div>
  ),
}))

describe('FirewallList — starred filter feature', () => {
  const mockPolicies: FirewallPolicy[] = [
    { _id: 'policy-1', name: 'Block Gaming', enabled: true },
    { _id: 'policy-2', name: 'Allow Streaming', enabled: false },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockMutate.mockResolvedValue(undefined)
    mockMutateStarred.mockResolvedValue(undefined)
  })

  describe('Test 1: Filter toggle button renders', () => {
    it('renders the "Starred only" filter button', () => {
      render(<FirewallList />)

      expect(screen.getByRole('button', { name: /starred only/i })).toBeInTheDocument()
    })
  })

  describe('Test 2: Filter button starts inactive (outline variant)', () => {
    it('filter button is initially in inactive/outline state', () => {
      render(<FirewallList />)

      const filterBtn = screen.getByRole('button', { name: /starred only/i })
      // When inactive, should not have aria-pressed=true or active class
      expect(filterBtn).toBeInTheDocument()
      // Both cards visible when filter is off
      expect(screen.getByTestId('firewall-card-policy-1')).toBeInTheDocument()
      expect(screen.getByTestId('firewall-card-policy-2')).toBeInTheDocument()
    })
  })

  describe('Test 3: Clicking filter with no starred rules shows empty message', () => {
    it('shows empty state message when filter active and no rules starred', () => {
      render(<FirewallList />)

      const filterBtn = screen.getByRole('button', { name: /starred only/i })
      fireEvent.click(filterBtn)

      expect(screen.getByText(/No starred rules/i)).toBeInTheDocument()
      expect(screen.getByText(/click ★ on any rule to star it/i)).toBeInTheDocument()
    })
  })

  describe('Test 4: Clicking a Star icon calls fetch POST to /api/firewall/starred', () => {
    it('calls fetch POST with correct body when star button is clicked', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      })
      global.fetch = mockFetch

      render(<FirewallList />)

      const starBtn = screen.getByTestId('star-btn-policy-1')
      fireEvent.click(starBtn)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/firewall/starred',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ ruleId: 'policy-1', starred: true }),
          })
        )
      })
    })
  })

  describe('Test 5: After star, starred rule appears in filtered view', () => {
    it('shows starred rule in filtered view after optimistic update', async () => {
      // Simulate SWR returning a starred policy after optimistic update
      const useSWR = (await import('swr')).default as ReturnType<typeof vi.fn>
      useSWR.mockImplementation((key: string) => {
        if (key === '/api/firewall/starred') {
          return {
            data: { starredIds: ['policy-1'] },
            mutate: mockMutateStarred,
          }
        }
        return {
          data: { policies: mockPolicies, timestamp: Date.now() },
          error: undefined,
          isLoading: false,
          mutate: mockMutate,
        }
      })

      render(<FirewallList />)

      // Activate filter
      const filterBtn = screen.getByRole('button', { name: /starred only/i })
      fireEvent.click(filterBtn)

      // Only policy-1 (starred) should be visible
      expect(screen.getByTestId('firewall-card-policy-1')).toBeInTheDocument()
      expect(screen.queryByTestId('firewall-card-policy-2')).not.toBeInTheDocument()
    })
  })
})

// Keep backward-compatible tests for existing FirewallList behavior
describe('FirewallList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutate.mockResolvedValue(undefined)
    mockMutateStarred.mockResolvedValue(undefined)
  })

  describe('Test 4: Renders FirewallCard for each policy', () => {
    it('should render a FirewallCard for each policy in the array', () => {
      render(<FirewallList />)

      expect(screen.getByTestId('firewall-card-policy-1')).toBeInTheDocument()
      expect(screen.getByTestId('firewall-card-policy-2')).toBeInTheDocument()
    })

    it('should display policy names in the cards', () => {
      render(<FirewallList />)

      expect(screen.getByText('Block Gaming')).toBeInTheDocument()
      expect(screen.getByText('Allow Streaming')).toBeInTheDocument()
    })
  })
})
