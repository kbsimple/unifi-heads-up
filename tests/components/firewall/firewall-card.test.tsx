// tests/components/firewall/firewall-card.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FirewallCard } from '@/components/firewall/firewall-card'
import type { FirewallPolicy } from '@/lib/unifi/types'

// Mock RuleToggle component
vi.mock('@/components/firewall/rule-toggle', () => ({
  RuleToggle: ({ policy }: { policy: FirewallPolicy }) => (
    <button
      data-testid="switch"
      data-checked={policy.enabled}
      aria-label={`Toggle ${policy.name}`}
    >
      {policy.enabled ? 'On' : 'Off'}
    </button>
  ),
}))

describe('FirewallCard', () => {
  const mockEnabledPolicy: FirewallPolicy = {
    _id: 'policy-1',
    name: 'Block Gaming',
    enabled: true,
  }

  const mockDisabledPolicy: FirewallPolicy = {
    _id: 'policy-2',
    name: 'Allow Streaming',
    enabled: false,
  }

  const noop = () => {}

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Test 1: Renders rule name', () => {
    it('should display the policy name in text-zinc-100', () => {
      render(<FirewallCard policy={mockEnabledPolicy} isStarred={false} onToggleStar={noop} />)

      expect(screen.getByText('Block Gaming')).toBeInTheDocument()
      const nameElement = screen.getByText('Block Gaming')
      expect(nameElement).toHaveClass('text-zinc-100')
    })
  })

  describe('Test 2: Renders "Enabled" badge when policy.enabled is true', () => {
    it('should render "Enabled" badge with variant="default" (sky-600)', () => {
      render(<FirewallCard policy={mockEnabledPolicy} isStarred={false} onToggleStar={noop} />)

      expect(screen.getByText('Enabled')).toBeInTheDocument()
      const badge = screen.getByText('Enabled')
      // Badge with variant="default" should have sky-600 styling (primary background)
      expect(badge.closest('[class*="bg-primary"]')).toBeInTheDocument()
    })
  })

  describe('Test 3: Renders "Disabled" badge when policy.enabled is false', () => {
    it('should render "Disabled" badge with variant="secondary" (zinc-700)', () => {
      render(<FirewallCard policy={mockDisabledPolicy} isStarred={false} onToggleStar={noop} />)

      expect(screen.getByText('Disabled')).toBeInTheDocument()
      const badge = screen.getByText('Disabled')
      // Badge with variant="secondary" should have secondary styling
      expect(badge.closest('[class*="bg-secondary"]')).toBeInTheDocument()
    })
  })

  describe('Test 4: Renders RuleToggle component with checked={policy.enabled}', () => {
    it('should render RuleToggle with checked state matching policy.enabled', () => {
      const { rerender } = render(
        <FirewallCard policy={mockEnabledPolicy} isStarred={false} onToggleStar={noop} />
      )

      let switchElement = screen.getByTestId('switch')
      expect(switchElement).toHaveAttribute('data-checked', 'true')

      rerender(
        <FirewallCard policy={mockDisabledPolicy} isStarred={false} onToggleStar={noop} />
      )
      switchElement = screen.getByTestId('switch')
      expect(switchElement).toHaveAttribute('data-checked', 'false')
    })
  })

  describe('Test 5: RuleToggle handles toggle internally', () => {
    it('should render RuleToggle component that handles toggle internally', () => {
      render(<FirewallCard policy={mockEnabledPolicy} isStarred={false} onToggleStar={noop} />)

      const switchElement = screen.getByTestId('switch')
      expect(switchElement).toBeInTheDocument()
      // RuleToggle handles the toggle internally via pending state
      // The actual toggle logic is tested in rule-toggle.test.tsx
    })
  })

  describe('Test 6: Switch has accessible aria-label', () => {
    it('should have aria-label="Toggle {policy.name}"', () => {
      render(<FirewallCard policy={mockEnabledPolicy} isStarred={false} onToggleStar={noop} />)

      const switchElement = screen.getByTestId('switch')
      expect(switchElement).toHaveAttribute('aria-label', 'Toggle Block Gaming')
    })
  })

  describe('Test 7: Star icon renders correctly', () => {
    it('renders star button with aria-label "Star rule" when not starred', () => {
      render(<FirewallCard policy={mockEnabledPolicy} isStarred={false} onToggleStar={noop} />)

      expect(screen.getByRole('button', { name: 'Star rule' })).toBeInTheDocument()
    })

    it('renders star button with aria-label "Unstar rule" when starred', () => {
      render(<FirewallCard policy={mockEnabledPolicy} isStarred={true} onToggleStar={noop} />)

      expect(screen.getByRole('button', { name: 'Unstar rule' })).toBeInTheDocument()
    })

    it('calls onToggleStar when star button is clicked', () => {
      const mockToggle = vi.fn()
      render(
        <FirewallCard policy={mockEnabledPolicy} isStarred={false} onToggleStar={mockToggle} />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Star rule' }))
      expect(mockToggle).toHaveBeenCalledTimes(1)
    })
  })
})
