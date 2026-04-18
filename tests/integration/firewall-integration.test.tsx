// tests/integration/firewall-integration.test.tsx
// Hermetic integration tests - MSW mocks API, no real UniFi calls
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { SWRConfig } from 'swr'
import { FirewallList } from '@/components/firewall/firewall-list'
import { FirewallCard } from '@/components/firewall/firewall-card'
import type { FirewallPolicy } from '@/lib/unifi/types'

// Helper to create mock policies
function createMockPolicies(count: number): FirewallPolicy[] {
  return Array.from({ length: count }, (_, i) => ({
    _id: `policy-${i + 1}`,
    name: `Rule ${i + 1}`,
    enabled: i % 2 === 0,
  }))
}

// Track API calls for assertions
const apiCalls = {
  getCalls: [] as Array<{ url: string; timestamp: number }>,
  putCalls: [] as Array<{ url: string; body: unknown; timestamp: number }>,
}

// Reset call tracking between tests
function resetApiCalls() {
  apiCalls.getCalls = []
  apiCalls.putCalls = []
}

// Mock policies for tests
let mockPolicies: FirewallPolicy[] = []

// MSW handlers for /api/firewall
const handlers = [
  // GET /api/firewall - list policies
  http.get('/api/firewall', () => {
    apiCalls.getCalls.push({ url: '/api/firewall', timestamp: Date.now() })
    return HttpResponse.json({
      policies: mockPolicies,
      timestamp: Date.now(),
    })
  }),

  // PUT /api/firewall - toggle policy
  http.put('/api/firewall', async ({ request }) => {
    const body = await request.json() as { policyId: string; enabled: boolean }
    apiCalls.putCalls.push({ url: '/api/firewall', body, timestamp: Date.now() })

    // Find and update the policy
    const policy = mockPolicies.find(p => p._id === body.policyId)
    if (policy) {
      policy.enabled = body.enabled
    }

    return HttpResponse.json({ success: true })
  }),
]

// MSW server for hermetic testing
const server = setupServer(...handlers)

// Setup MSW server once for all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetApiCalls()
  mockPolicies = []
})
afterAll(() => server.close())

// Wrapper component that provides fresh SWR cache for each test
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  )
}

describe('Firewall Integration Tests', () => {
  describe('FirewallList - API Integration', () => {
    it('should call GET /api/firewall on mount', async () => {
      mockPolicies = createMockPolicies(3)

      render(
        <TestWrapper>
          <FirewallList initialData={undefined} />
        </TestWrapper>
      )

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument()
      })

      // Verify API was called
      expect(apiCalls.getCalls.length).toBeGreaterThanOrEqual(1)
      expect(apiCalls.getCalls[0].url).toBe('/api/firewall')
    })

    it('should display loading skeleton while fetching', async () => {
      let resolvePromise: () => void
      const delayedPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })

      server.use(
        http.get('/api/firewall', async () => {
          await delayedPromise
          return HttpResponse.json({
            policies: createMockPolicies(2),
            timestamp: Date.now(),
          })
        })
      )

      // Render without waiting
      render(
        <TestWrapper>
          <FirewallList initialData={undefined} />
        </TestWrapper>
      )

      // Check for skeletons immediately (before promise resolves)
      // The Skeleton component uses data-slot="skeleton" but doesn't have a test id
      // We look for elements with the skeleton class structure
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)

      // Resolve the promise
      resolvePromise!()

      // Wait for content to appear
      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument()
      })
    })

    it('should display error state when API fails', async () => {
      // Use HttpResponse.error() to simulate a network error
      server.use(
        http.get('/api/firewall', () => {
          return HttpResponse.error()
        })
      )

      render(
        <TestWrapper>
          <FirewallList initialData={undefined} />
        </TestWrapper>
      )

      // Error component should appear
      await waitFor(() => {
        expect(screen.getByText('Unable to load firewall rules')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should display empty state when no policies', async () => {
      mockPolicies = []

      render(
        <TestWrapper>
          <FirewallList initialData={undefined} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('No firewall rules found')).toBeInTheDocument()
      })
    })

    it('should render all policies from API response', async () => {
      mockPolicies = createMockPolicies(5)

      render(
        <TestWrapper>
          <FirewallList initialData={undefined} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument()
        expect(screen.getByText('Rule 5')).toBeInTheDocument()
      })

      // Verify 5 policy cards are rendered by checking for unique policy names
      expect(screen.getByText('Rule 1')).toBeInTheDocument()
      expect(screen.getByText('Rule 2')).toBeInTheDocument()
      expect(screen.getByText('Rule 3')).toBeInTheDocument()
      expect(screen.getByText('Rule 4')).toBeInTheDocument()
      expect(screen.getByText('Rule 5')).toBeInTheDocument()
    })
  })

  describe('RuleToggle - API Integration', () => {
    it('should call PUT /api/firewall with correct payload when toggled', async () => {
      mockPolicies = [{
        _id: 'policy-test-1',
        name: 'Test Rule',
        enabled: true,
      }]

      render(
        <TestWrapper>
          <FirewallCard policy={mockPolicies[0]} policies={mockPolicies} />
        </TestWrapper>
      )

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('Test Rule')).toBeInTheDocument()
      })

      // Find and click the toggle (it's a switch, not a button)
      const toggle = screen.getByRole('switch', { name: /toggle test rule/i })
      fireEvent.click(toggle)

      // Verify PUT was called with correct payload
      await waitFor(() => {
        expect(apiCalls.putCalls.length).toBeGreaterThanOrEqual(1)
        expect(apiCalls.putCalls[0].body).toEqual({
          policyId: 'policy-test-1',
          enabled: false, // Toggling from true to false
        })
      })
    })
  })

  describe('Full User Flow', () => {
    it('should load policies, display them, and allow toggle', async () => {
      mockPolicies = createMockPolicies(2)

      // Step 1: Load policies
      render(
        <TestWrapper>
          <FirewallList initialData={undefined} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument()
        expect(screen.getByText('Rule 2')).toBeInTheDocument()
      })

      // Step 2: Verify initial state - Rule 1 is Enabled (index 0, even = enabled)
      expect(screen.getByText('Enabled')).toBeInTheDocument()

      // Step 3: Toggle Rule 1 (toggle is a switch element)
      const toggle = screen.getAllByRole('switch', { name: /toggle rule/i })[0]
      fireEvent.click(toggle)

      // Step 4: Verify optimistic update and API call
      await waitFor(() => {
        expect(screen.getByText('Disabled')).toBeInTheDocument()
        expect(apiCalls.putCalls.length).toBeGreaterThanOrEqual(1)
        expect(apiCalls.putCalls[0].body).toEqual({
          policyId: 'policy-1',
          enabled: false,
        })
      })
    })
  })
})