// tests/error-messages.test.ts
import { describe, it, expect } from 'vitest'
import { ERROR_MESSAGES, getErrorMessage } from '@/lib/definitions'

describe('Error Messages (UIUX-04)', () => {
  it('maps INVALID_CREDENTIALS to human-readable message', () => {
    expect(ERROR_MESSAGES.INVALID_CREDENTIALS).toBe('Invalid username or password')
  })

  it('maps SESSION_EXPIRED to human-readable message', () => {
    expect(ERROR_MESSAGES.SESSION_EXPIRED).toBe('Your session has expired. Please sign in again.')
  })

  it('maps NETWORK_ERROR to human-readable message', () => {
    expect(ERROR_MESSAGES.NETWORK_ERROR).toBe('Unable to connect. Please check your connection and try again.')
  })

  it('getErrorMessage returns correct message for known code', () => {
    expect(getErrorMessage('INVALID_CREDENTIALS')).toBe('Invalid username or password')
  })

  it('getErrorMessage returns UNKNOWN message for unknown code', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe('An unexpected error occurred. Please try again.')
  })
})