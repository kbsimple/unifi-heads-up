// tests/components/dashboard/last-updated.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LastUpdated } from '@/components/dashboard/last-updated'

describe('LastUpdated', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render "just now" for recent timestamp', () => {
    const now = new Date()
    render(<LastUpdated date={now} />)

    expect(screen.getByText(/just now/)).toBeInTheDocument()
  })

  it('should render minutes ago for timestamps within an hour', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    render(<LastUpdated date={fiveMinutesAgo} />)

    expect(screen.getByText(/5m ago/)).toBeInTheDocument()
  })

  it('should render hours ago for timestamps over an hour', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    render(<LastUpdated date={twoHoursAgo} />)

    expect(screen.getByText(/2h ago/)).toBeInTheDocument()
  })

  it('should show spinning icon when loading', () => {
    const now = new Date()
    render(<LastUpdated date={now} isLoading={true} />)

    // Look for the RefreshCw icon with animate-spin class
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should not show spinning icon when not loading', () => {
    const now = new Date()
    render(<LastUpdated date={now} isLoading={false} />)

    const spinner = document.querySelector('.animate-spin')
    expect(spinner).not.toBeInTheDocument()
  })

  it('should update relative time every 60 seconds', async () => {
    const now = new Date()
    render(<LastUpdated date={now} />)

    // Initially shows "just now"
    expect(screen.getByText(/just now/)).toBeInTheDocument()

    // Advance time by 65 seconds and wrap in act for React state update
    await act(async () => {
      vi.advanceTimersByTime(65000)
    })

    // Should now show "1m ago"
    expect(screen.getByText(/1m ago/)).toBeInTheDocument()
  })
})