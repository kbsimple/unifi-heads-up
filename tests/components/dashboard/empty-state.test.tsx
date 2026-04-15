// tests/components/dashboard/empty-state.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from '@/components/dashboard/empty-state'

describe('EmptyState', () => {
  it('should show "No devices found" message', () => {
    render(<EmptyState />)

    expect(screen.getByText('No devices found')).toBeInTheDocument()
    expect(screen.getByText(/Your network may be empty/)).toBeInTheDocument()
  })
})