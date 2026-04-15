// tests/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Set SESSION_SECRET before any modules are imported
// This must be set before the session module is loaded
process.env.SESSION_SECRET = 'test-secret-key-must-be-at-least-32-characters-long-for-hs256'

// Mock server-only module for test environment
vi.mock('server-only', () => ({}))

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