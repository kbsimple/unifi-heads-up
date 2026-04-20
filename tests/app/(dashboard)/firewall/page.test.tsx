// tests/app/(dashboard)/firewall/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock dependencies
vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(() => Promise.resolve({ isAuth: true, username: 'admin' })),
}))

vi.mock('@/lib/unifi/client', () => ({
  getFirewallPolicies: vi.fn(() =>
    Promise.resolve([
      { _id: 'policy-1', name: 'Block Gaming', enabled: true },
      { _id: 'policy-2', name: 'Allow Streaming', enabled: false },
    ])
  ),
}))

vi.mock('@/components/firewall/firewall-list', () => ({
  FirewallList: ({ initialData }: { initialData: any }) => (
    <div data-testid="firewall-list" data-policies={initialData?.policies?.length ?? 0}>
      FirewallList rendered with {initialData?.policies?.length ?? 0} policies
    </div>
  ),
}))

describe('FirewallPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Test 1: Page verifies session before rendering', () => {
    it('should call verifySession before rendering', async () => {
      const { verifySession } = await import('@/lib/dal')
      const { default: FirewallPage } = await import('@/app/dashboard/firewall/page')

      render(await FirewallPage())

      expect(verifySession).toHaveBeenCalled()
    })
  })

  describe('Test 2: Page fetches initial data via getFirewallPolicies', () => {
    it('should call getFirewallPolicies to fetch initial data', async () => {
      const { getFirewallPolicies } = await import('@/lib/unifi/client')
      const { default: FirewallPage } = await import('@/app/dashboard/firewall/page')

      render(await FirewallPage())

      expect(getFirewallPolicies).toHaveBeenCalled()
    })
  })

  describe('Test 3: Page passes initialData to FirewallList', () => {
    it('should pass initial policies to FirewallList component', async () => {
      const { default: FirewallPage } = await import('@/app/dashboard/firewall/page')

      render(await FirewallPage())

      const firewallList = screen.getByTestId('firewall-list')
      expect(firewallList).toHaveAttribute('data-policies', '2')
      expect(screen.getByText(/FirewallList rendered with 2 policies/)).toBeInTheDocument()
    })
  })

  describe('Test 4: Page renders FirewallList component', () => {
    it('should render FirewallList component', async () => {
      const { default: FirewallPage } = await import('@/app/dashboard/firewall/page')

      render(await FirewallPage())

      expect(screen.getByTestId('firewall-list')).toBeInTheDocument()
    })
  })
})