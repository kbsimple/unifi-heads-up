// tests/components/dashboard/traffic-badge.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrafficBadge } from '@/components/dashboard/traffic-badge'

describe('TrafficBadge', () => {
  it('should render "Idle" with gray styling', () => {
    render(<TrafficBadge status="idle" />)
    const badge = screen.getByText('Idle')
    expect(badge).toBeInTheDocument()
    // Check for gray color classes (zinc-500/20 background, zinc-400 text)
    expect(badge.closest('span')).toHaveClass('bg-zinc-500/20')
    expect(badge.closest('span')).toHaveClass('text-zinc-400')
  })

  it('should render "Low" with green styling', () => {
    render(<TrafficBadge status="low" />)
    const badge = screen.getByText('Low')
    expect(badge).toBeInTheDocument()
    // Check for green color classes (green-500/20 background, green-400 text)
    expect(badge.closest('span')).toHaveClass('bg-green-500/20')
    expect(badge.closest('span')).toHaveClass('text-green-400')
  })

  it('should render "Medium" with yellow styling', () => {
    render(<TrafficBadge status="medium" />)
    const badge = screen.getByText('Medium')
    expect(badge).toBeInTheDocument()
    // Check for yellow color classes (yellow-500/20 background, yellow-400 text)
    expect(badge.closest('span')).toHaveClass('bg-yellow-500/20')
    expect(badge.closest('span')).toHaveClass('text-yellow-400')
  })

  it('should render "High" with red styling', () => {
    render(<TrafficBadge status="high" />)
    const badge = screen.getByText('High')
    expect(badge).toBeInTheDocument()
    // Check for red color classes (red-500/20 background, red-400 text)
    expect(badge.closest('span')).toHaveClass('bg-red-500/20')
    expect(badge.closest('span')).toHaveClass('text-red-400')
  })
})