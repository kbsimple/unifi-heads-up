// tests/app/(dashboard)/layout.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock next/navigation for usePathname
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}))

// Mock child components
vi.mock('@/components/logout-button', () => ({
  LogoutButton: () => <button data-testid="logout-button">Logout</button>,
}))

describe('DashboardLayout Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Test 1: Layout renders Dashboard and Firewall navigation tabs', () => {
    it('should render both Dashboard and Firewall navigation tabs', async () => {
      const { default: DashboardLayout } = await import('@/app/dashboard/layout')

      render(
        <DashboardLayout>
          <div>Test content</div>
        </DashboardLayout>
      )

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /firewall/i })).toBeInTheDocument()
    })
  })

  describe('Test 2: Dashboard tab links to root and shows as active on root path', () => {
    it('should have Dashboard tab linked to "/" with active styling on root path', async () => {
      vi.doMock('next/navigation', () => ({
        usePathname: vi.fn(() => '/'),
      }))

      // Re-import after mock update
      vi.resetModules()
      const { default: DashboardLayout } = await import('@/app/dashboard/layout')

      render(
        <DashboardLayout>
          <div>Test content</div>
        </DashboardLayout>
      )

      const dashboardTab = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardTab).toHaveAttribute('href', '/')
      // Active tab should have accent color (sky-600)
      expect(dashboardTab).toHaveClass('text-sky-600')
    })
  })

  describe('Test 3: Firewall tab links to /firewall and shows as active on firewall path', () => {
    it('should have Firewall tab linked to "/firewall" with active styling when on firewall path', async () => {
      vi.doMock('next/navigation', () => ({
        usePathname: vi.fn(() => '/firewall'),
      }))

      vi.resetModules()
      const { default: DashboardLayout } = await import('@/app/dashboard/layout')

      render(
        <DashboardLayout>
          <div>Test content</div>
        </DashboardLayout>
      )

      const firewallTab = screen.getByRole('link', { name: /firewall/i })
      expect(firewallTab).toHaveAttribute('href', '/firewall')
      // Active tab should have accent color (sky-600)
      expect(firewallTab).toHaveClass('text-sky-600')
    })
  })

  describe('Test 4: Active tab has accent color styling', () => {
    it('should show inactive tab with zinc-400 styling', async () => {
      vi.doMock('next/navigation', () => ({
        usePathname: vi.fn(() => '/'),
      }))

      vi.resetModules()
      const { default: DashboardLayout } = await import('@/app/dashboard/layout')

      render(
        <DashboardLayout>
          <div>Test content</div>
        </DashboardLayout>
      )

      const firewallTab = screen.getByRole('link', { name: /firewall/i })
      // Inactive tab should have zinc-400
      expect(firewallTab).toHaveClass('text-zinc-400')
    })
  })

  describe('Test 5: Logout button remains on right side', () => {
    it('should keep LogoutButton in the header', async () => {
      const { default: DashboardLayout } = await import('@/app/dashboard/layout')

      render(
        <DashboardLayout>
          <div>Test content</div>
        </DashboardLayout>
      )

      expect(screen.getByTestId('logout-button')).toBeInTheDocument()
    })
  })
})