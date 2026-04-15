// tests/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock next/headers cookies() for all tests
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    })
  ),
}))