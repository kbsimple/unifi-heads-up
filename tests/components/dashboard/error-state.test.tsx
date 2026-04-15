// tests/components/dashboard/error-state.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorState } from '@/components/dashboard/error-state'

describe('ErrorState', () => {
  it('should show error message with retry button', () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)

    expect(screen.getByText('Unable to reach network service')).toBeInTheDocument()
    expect(screen.getByText(/Please check your connection/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)

    const retryButton = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryButton)

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})