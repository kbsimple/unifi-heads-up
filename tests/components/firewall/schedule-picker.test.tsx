import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { SchedulePicker } from '@/components/firewall/schedule-picker'
import type { FirewallPolicy } from '@/lib/unifi/types'

const mockMutate = vi.fn()
vi.mock('swr', () => ({
  useSWRConfig: () => ({ mutate: mockMutate }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

// Mock Popover to render children inline — avoids base-ui portal issues in jsdom
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children, disabled, 'aria-label': ariaLabel, className }: { children: React.ReactNode; disabled?: boolean; asChild?: boolean; 'aria-label'?: string; className?: string }) => (
    <button disabled={disabled} aria-label={ariaLabel} className={className}>{children}</button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-content">{children}</div>,
}))

// Mock Button to render as a button element so fireEvent.click works
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, 'aria-label': ariaLabel, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label'?: string }) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={className} {...props}>
      {children}
    </button>
  ),
}))

const basePolicy: FirewallPolicy = {
  _id: 'policy-1',
  name: 'Block Gaming',
  enabled: true,
}
const scheduledPolicy: FirewallPolicy = {
  ...basePolicy,
  scheduleEnd: Date.now() + 2 * 60 * 60 * 1000, // 2h from now
}

describe('SchedulePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  // Group A — Rendering
  describe('A: Rendering', () => {
    it('A1: clock button has aria-label "Set schedule for {name}" when no scheduleEnd', () => {
      render(<SchedulePicker policy={basePolicy} />)
      expect(screen.getByRole('button', { name: 'Set schedule for Block Gaming' })).toBeInTheDocument()
    })

    it('A2: clock button has aria-label "Edit schedule for {name}" when scheduleEnd is set', () => {
      render(<SchedulePicker policy={scheduledPolicy} />)
      expect(screen.getByRole('button', { name: 'Edit schedule for Block Gaming' })).toBeInTheDocument()
    })
  })

  // Group B — Preset click sends correct schedule
  describe('B: Preset click sends correct schedule', () => {
    it('B1: clicking "2h" calls fetch POST with durationHours: 2', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })
      render(<SchedulePicker policy={basePolicy} />)
      fireEvent.click(screen.getByRole('button', { name: 'Enable for 2 hours' }))
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/firewall/schedule',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ policyId: 'policy-1', durationHours: 2 }),
          })
        )
      })
    })

    it('B2: clicking "6h" calls fetch POST with durationHours: 6', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })
      render(<SchedulePicker policy={basePolicy} />)
      fireEvent.click(screen.getByRole('button', { name: 'Enable for 6 hours' }))
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/firewall/schedule',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ policyId: 'policy-1', durationHours: 6 }),
          })
        )
      })
    })

    it('B3: clicking "24h" calls fetch POST with durationHours: 24', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })
      render(<SchedulePicker policy={basePolicy} />)
      fireEvent.click(screen.getByRole('button', { name: 'Enable for 24 hours' }))
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/firewall/schedule',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ policyId: 'policy-1', durationHours: 24 }),
          })
        )
      })
    })

    it('B4: after successful POST, mutate("/api/firewall") is called', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })
      render(<SchedulePicker policy={basePolicy} />)
      fireEvent.click(screen.getByRole('button', { name: 'Enable for 2 hours' }))
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith('/api/firewall')
      })
    })
  })

  // Group C — Pending state
  describe('C: Pending state', () => {
    it('C1: clock trigger button is disabled while fetch is in flight', async () => {
      let resolveFetch!: (value: unknown) => void
      ;(global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        new Promise((resolve) => { resolveFetch = resolve })
      )
      render(<SchedulePicker policy={basePolicy} />)
      fireEvent.click(screen.getByRole('button', { name: 'Enable for 2 hours' }))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Set schedule for Block Gaming' })).toBeDisabled()
      })
      act(() => { resolveFetch({ ok: true }) })
    })

    it('C2: wrapper div has opacity-50 class while fetch is in flight', async () => {
      let resolveFetch!: (value: unknown) => void
      ;(global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        new Promise((resolve) => { resolveFetch = resolve })
      )
      const { container } = render(<SchedulePicker policy={basePolicy} />)
      fireEvent.click(screen.getByRole('button', { name: 'Enable for 2 hours' }))
      await waitFor(() => {
        // The outermost div rendered by SchedulePicker gets opacity-50 when pending
        const outerDiv = container.firstElementChild as HTMLElement
        expect(outerDiv?.className).toContain('opacity-50')
      })
      act(() => { resolveFetch({ ok: true }) })
    })
  })

  // Group D — Clear schedule
  describe('D: Clear schedule', () => {
    it('D1: "Clear schedule" button is NOT rendered when policy has no scheduleEnd', () => {
      render(<SchedulePicker policy={basePolicy} />)
      expect(screen.queryByRole('button', { name: /Clear schedule/i })).not.toBeInTheDocument()
    })

    it('D2: "Clear schedule" button IS rendered when policy.scheduleEnd is set', () => {
      render(<SchedulePicker policy={scheduledPolicy} />)
      expect(screen.getByRole('button', { name: 'Clear schedule for Block Gaming' })).toBeInTheDocument()
    })

    it('D3: clicking "Clear schedule" calls fetch DELETE with { policyId }', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })
      render(<SchedulePicker policy={scheduledPolicy} />)
      fireEvent.click(screen.getByRole('button', { name: 'Clear schedule for Block Gaming' }))
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/firewall/schedule',
          expect.objectContaining({
            method: 'DELETE',
            body: JSON.stringify({ policyId: 'policy-1' }),
          })
        )
      })
    })

    it('D4: after successful DELETE, mutate("/api/firewall") is called', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })
      render(<SchedulePicker policy={scheduledPolicy} />)
      fireEvent.click(screen.getByRole('button', { name: 'Clear schedule for Block Gaming' }))
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith('/api/firewall')
      })
    })
  })

  // Group E — Error handling
  describe('E: Error handling', () => {
    it('E1: fetch rejection on preset → toast.error("Unable to set schedule. Try again.")', async () => {
      const { toast } = await import('sonner')
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))
      render(<SchedulePicker policy={basePolicy} />)
      fireEvent.click(screen.getByRole('button', { name: 'Enable for 2 hours' }))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Unable to set schedule. Try again.')
      })
    })

    it('E2: non-ok response on clear → toast.error("Unable to clear schedule. Try again.")', async () => {
      const { toast } = await import('sonner')
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 500 })
      render(<SchedulePicker policy={scheduledPolicy} />)
      fireEvent.click(screen.getByRole('button', { name: 'Clear schedule for Block Gaming' }))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Unable to clear schedule. Try again.')
      })
    })
  })
})
