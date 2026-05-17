// tests/components/firewall/rule-toggle.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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

// Mock Switch component — forward disabled prop so tests can assert on it
vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, 'aria-label': ariaLabel, disabled }: {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    'aria-label': string
    disabled?: boolean
  }) => (
    <button
      data-testid="switch"
      data-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
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

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Test 1: Renders Switch with checked={policy.enabled}', () => {
    it('should render switch reflecting policy.enabled state', () => {
      render(<RuleToggle policy={mockPolicy} />)

      const switchElement = screen.getByTestId('switch')
      expect(switchElement).toHaveAttribute('data-checked', 'true')
    })

    it('should render switch as unchecked when policy.enabled is false', () => {
      const disabledPolicy = { ...mockPolicy, enabled: false }
      render(<RuleToggle policy={disabledPolicy} />)

      const switchElement = screen.getByTestId('switch')
      expect(switchElement).toHaveAttribute('data-checked', 'false')
    })
  })

  describe('Test 2: Switch is disabled while fetch is in progress', () => {
    it('should disable the switch immediately when clicked', async () => {
      // Never-resolving promise so we can inspect mid-flight state
      let resolveFetch!: (value: unknown) => void
      ;(global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        new Promise((resolve) => { resolveFetch = resolve })
      )

      render(<RuleToggle policy={mockPolicy} />)

      const switchElement = screen.getByTestId('switch')
      expect(switchElement).not.toBeDisabled()

      fireEvent.click(switchElement)

      // Switch must be disabled while the fetch is in flight
      await waitFor(() => {
        expect(screen.getByTestId('switch')).toBeDisabled()
      })

      // Resolve the fetch so the component can clean up
      act(() => {
        resolveFetch({ ok: true })
      })
    })

    it('should wrap switch in opacity-50 div while pending', async () => {
      let resolveFetch!: (value: unknown) => void
      ;(global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        new Promise((resolve) => { resolveFetch = resolve })
      )

      render(<RuleToggle policy={mockPolicy} />)

      fireEvent.click(screen.getByTestId('switch'))

      await waitFor(() => {
        const wrapper = screen.getByTestId('switch').parentElement
        expect(wrapper?.className).toContain('opacity-50')
      })

      act(() => { resolveFetch({ ok: true }) })
    })
  })

  describe('Test 3: Calls PUT /api/firewall with { policyId, enabled }', () => {
    it('should make PUT request to /api/firewall with correct body', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

      render(<RuleToggle policy={mockPolicy} />)

      fireEvent.click(screen.getByTestId('switch'))

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

  describe('Test 4: After successful fetch, mutate revalidates with no args', () => {
    it('should call mutate("/api/firewall") with no data arg on success', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

      render(<RuleToggle policy={mockPolicy} />)

      fireEvent.click(screen.getByTestId('switch'))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith('/api/firewall')
      })
    })

    it('should re-enable switch after successful fetch', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })
      mockMutate.mockResolvedValueOnce(undefined)

      render(<RuleToggle policy={mockPolicy} />)

      fireEvent.click(screen.getByTestId('switch'))

      await waitFor(() => {
        expect(screen.getByTestId('switch')).not.toBeDisabled()
      })
    })
  })

  describe('Test 5: Shows toast error and re-enables switch on fetch failure', () => {
    it('should call toast.error when fetch rejects', async () => {
      const { toast } = await import('sonner')
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

      render(<RuleToggle policy={mockPolicy} />)

      fireEvent.click(screen.getByTestId('switch'))

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

      render(<RuleToggle policy={mockPolicy} />)

      fireEvent.click(screen.getByTestId('switch'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Unable to update firewall rule. Changes reverted automatically.'
        )
      })
    })

    it('should re-enable switch after failed fetch', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

      render(<RuleToggle policy={mockPolicy} />)

      fireEvent.click(screen.getByTestId('switch'))

      await waitFor(() => {
        expect(screen.getByTestId('switch')).not.toBeDisabled()
      })
    })
  })
})
