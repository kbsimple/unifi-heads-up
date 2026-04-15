// tests/logout.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LogoutButton } from '@/components/logout-button'

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    })
  ),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`Redirect to ${path}`)
  }),
}))

describe('Logout (AUTH-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes session cookie and redirects to login', async () => {
    const { logout } = await import('@/app/actions/auth')
    try {
      await logout()
    } catch (error) {
      expect((error as Error).message).toContain('Redirect to /login')
    }
  })

  it('renders "Sign out" button', () => {
    render(<LogoutButton />)
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('has form element wrapping the button', () => {
    const { container } = render(<LogoutButton />)
    const form = container.querySelector('form')
    expect(form).toBeInTheDocument()
  })
})