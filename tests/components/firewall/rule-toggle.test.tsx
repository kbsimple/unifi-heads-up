// tests/components/firewall/rule-toggle.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RuleToggle } from '@/components/firewall/rule-toggle'
import type { FirewallPolicy } from '@/lib/unifi/types'

// Mock useSWRConfig from SWR
const mockMutate = vi.fn()
vi.mock('swr', () => ({
  useSWRConfig: () => ({ mutate: mockMutate }),
}))

// Mock toast from sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

// Mock Switch component
vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, 'aria-label': ariaLabel }: {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    'aria-label': string
  }) => (
    <button
      data-testid="switch"
      data-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
    >
      {checked ? 'On' : 'Off'}
    </button>
  ),
}))

describe('RuleToggle', () => {
  const mockPolicy: FirewallPolicy = {
    _id: 'policy-1',
    name: 'Block Gaming',
    enabled: true,
  }

  const mockPolicies: FirewallPolicy[] = [
    mockPolicy,
    { _id: 'policy-2', name: 'Allow Streaming', enabled: false },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  describe('Test 1: Renders Switch with checked={policy.enabled}', () => {
    it('should render switch reflecting policy.enabled state', () => {
      render(<RuleToggle policy={mockPolicy} policies={mockPolicies} />)

      const switchElement = screen.getByTestId('switch')
      expect(switchElement).toHaveAttribute('data-checked', 'true')
    })

    it('should render switch as unchecked when policy.enabled is false', () => {
      const disabledPolicy = { ...mockPolicy, enabled: false }
      render(<RuleToggle policy={disabledPolicy} policies={mockPolicies} />)

      const switchElement = screen.getByTestId('switch')
      expect(switchElement).toHaveAttribute('data-checked', 'false')
    })
  })

  describe('Test 2: Calls mutate with optimisticData immediately on toggle', () => {
    it('should call mutate with optimisticData when switch is clicked', async () => {
      render(<RuleToggle policy={mockPolicy} policies={mockPolicies} />)

      const switchElement = screen.getByTestId('switch')
      fireEvent.click(switchElement)

      expect(mockMutate).toHaveBeenCalledWith(
        '/api/firewall',
        expect.arrayContaining([
          expect.objectContaining({ _id: 'policy-1', enabled: false }),
          expect.objectContaining({ _id: 'policy-2', enabled: false }),
        ]),
        expect.objectContaining({
          optimisticData: expect.any(Array),
          rollbackOnError: true,
          revalidate: true,
        })
      )
    })

    it('should include optimisticData that matches the mutate data', async () => {
      render(<RuleToggle policy={mockPolicy} policies={mockPolicies} />)

      const switchElement = screen.getByTestId('switch')
      fireEvent.click(switchElement)

      expect(mockMutate).toHaveBeenCalledWith(
        '/api/firewall',
        expect.any(Array),
        expect.objectContaining({
          optimisticData: expect.any(Array),
        })
      )

      // Verify optimisticData matches the first argument (the new state)
      const callArgs = mockMutate.mock.calls[0]
      const mutateData = callArgs[1]
      const optimisticData = callArgs[2].optimisticData
      expect(mutateData).toEqual(optimisticData)
    })
  })

  describe('Test 3: Calls PUT /api/firewall with { policyId, enabled }', () => {
    it('should make PUT request to /api/firewall with correct body', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'policy-1', name: 'Block Gaming', enabled: false }),
      })

      render(<RuleToggle policy={mockPolicy} policies={mockPolicies} />)

      const switchElement = screen.getByTestId('switch')
      fireEvent.click(switchElement)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/firewall',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({ policyId: 'policy-1', enabled: false }),
          })
        )
      })
    })
  })

  describe('Test 4: Shows toast error on fetch failure', () => {
    it('should call toast.error when fetch fails', async () => {
      const { toast } = await import('sonner')
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

      render(<RuleToggle policy={mockPolicy} policies={mockPolicies} />)

      const switchElement = screen.getByTestId('switch')
      fireEvent.click(switchElement)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Unable to update firewall rule. Changes reverted automatically.'
        )
      })
    })

    it('should call toast.error when fetch returns non-ok response', async () => {
      const { toast } = await import('sonner')
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      render(<RuleToggle policy={mockPolicy} policies={mockPolicies} />)

      const switchElement = screen.getByTestId('switch')
      fireEvent.click(switchElement)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Unable to update firewall rule. Changes reverted automatically.'
        )
      })
    })
  })

  describe('Test 5: SWR rollbackOnError reverts state on error', () => {
    it('should use rollbackOnError: true in mutate options', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'policy-1', name: 'Block Gaming', enabled: false }),
      })

      render(<RuleToggle policy={mockPolicy} policies={mockPolicies} />)

      const switchElement = screen.getByTestId('switch')
      fireEvent.click(switchElement)

      expect(mockMutate).toHaveBeenCalledWith(
        '/api/firewall',
        expect.any(Array),
        expect.objectContaining({
          rollbackOnError: true,
        })
      )
    })
  })
})